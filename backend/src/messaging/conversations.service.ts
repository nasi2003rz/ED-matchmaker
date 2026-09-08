import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { NOTIFICATION_EVENTS, MessageNewEvent } from '../notifications/events/notification-events.js';

type ParticipantKind = 'INSTRUCTOR' | 'STUDENT' | 'PARENT';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---- Roster-relationship guards (server-side authorization — CLAUDE.md
  // Section 9: a conversation may only be started between people who
  // actually have a relationship, mirroring the InstructorStudent roster) ----

  // `perspective` picks who the error message is addressed to — this guard
  // is called from both the instructor's and the student's "start" flow,
  // and the two sides read very differently ("not on your roster" vs.
  // "not one of your instructors").
  private async assertInstructorStudentLink(
    instructorId: string,
    studentId: string,
    perspective: 'INSTRUCTOR' | 'STUDENT' = 'INSTRUCTOR',
  ) {
    const link = await this.prisma.instructorStudent.findUnique({
      where: { instructorId_studentId: { instructorId, studentId } },
    });
    if (!link || link.status !== 'ACTIVE') {
      throw new ForbiddenException(
        perspective === 'INSTRUCTOR'
          ? 'این دانش‌آموز در فهرست دانش‌آموزان شما نیست.'
          : 'این مربی در فهرست مربیان شما نیست.',
      );
    }
  }

  private async assertInstructorParentLink(
    instructorId: string,
    parentId: string,
    perspective: 'INSTRUCTOR' | 'PARENT' = 'INSTRUCTOR',
  ) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      include: { children: true },
    });
    if (!parent) throw new NotFoundException('والد یافت نشد.');
    const childIds = parent.children.map((c) => c.id);
    const link =
      childIds.length > 0
        ? await this.prisma.instructorStudent.findFirst({
            where: { instructorId, studentId: { in: childIds }, status: 'ACTIVE' },
          })
        : null;
    if (!link) {
      throw new ForbiddenException(
        perspective === 'INSTRUCTOR'
          ? 'هیچ‌کدام از فرزندان این والد در فهرست دانش‌آموزان شما نیستند.'
          : 'این مربی در فهرست مربیان فرزندان شما نیست.',
      );
    }
  }

  private async getOrCreateConversation(
    instructorId: string,
    other: { studentId?: string; parentId?: string },
  ) {
    if (other.studentId) {
      return this.prisma.conversation.upsert({
        where: { instructorId_studentId: { instructorId, studentId: other.studentId } },
        update: {},
        create: { instructorId, studentId: other.studentId },
      });
    }
    return this.prisma.conversation.upsert({
      where: { instructorId_parentId: { instructorId, parentId: other.parentId! } },
      update: {},
      create: { instructorId, parentId: other.parentId },
    });
  }

  private async appendMessage(conversationId: string, senderUserId: string, content: string) {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        instructor: { include: { user: true } },
        student: { include: { user: true } },
        parent: { include: { user: true } },
      },
    });

    await this.prisma.message.create({ data: { conversationId, senderUserId, content } });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const isSenderInstructor = conversation.instructor.user.id === senderUserId;
    const otherUser = conversation.student?.user ?? conversation.parent?.user;
    const senderName = isSenderInstructor ? conversation.instructor.user.name : (otherUser?.name ?? '');
    const recipientUserId = isSenderInstructor ? otherUser?.id : conversation.instructor.user.id;

    if (recipientUserId) {
      this.eventEmitter.emit(
        NOTIFICATION_EVENTS.MESSAGE_NEW,
        new MessageNewEvent(recipientUserId, senderName, conversationId),
      );
    }
  }

  // Resolves which of the caller's profiles (at most one is relevant) makes
  // them a legitimate party to this conversation; throws otherwise.
  private async resolveParticipant(
    userId: string,
    conversation: { instructorId: string; studentId: string | null; parentId: string | null },
  ): Promise<ParticipantKind> {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (instructor && instructor.id === conversation.instructorId) return 'INSTRUCTOR';
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (student && conversation.studentId === student.id) return 'STUDENT';
    const parent = await this.prisma.parent.findUnique({ where: { userId } });
    if (parent && conversation.parentId === parent.id) return 'PARENT';
    throw new ForbiddenException('شما به این گفتگو دسترسی ندارید.');
  }

  // ---- Instructor side ----

  private async requireInstructorId(userId: string): Promise<string> {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) throw new NotFoundException('پروفایل مربی یافت نشد.');
    return instructor.id;
  }

  async listForInstructor(userId: string) {
    const instructorId = await this.requireInstructorId(userId);
    const conversations = await this.prisma.conversation.findMany({
      where: { instructorId },
      include: {
        student: { include: { user: true } },
        parent: { include: { user: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return this.toSummaries(conversations, userId, 'INSTRUCTOR');
  }

  async startFromInstructor(
    userId: string,
    dto: { studentId?: string; parentId?: string; content: string },
  ) {
    const instructorId = await this.requireInstructorId(userId);
    if ((dto.studentId && dto.parentId) || (!dto.studentId && !dto.parentId)) {
      throw new BadRequestException('دقیقاً یکی از studentId یا parentId باید مشخص شود.');
    }

    let conversation;
    if (dto.studentId) {
      await this.assertInstructorStudentLink(instructorId, dto.studentId);
      conversation = await this.getOrCreateConversation(instructorId, { studentId: dto.studentId });
    } else {
      await this.assertInstructorParentLink(instructorId, dto.parentId!);
      conversation = await this.getOrCreateConversation(instructorId, { parentId: dto.parentId });
    }

    await this.appendMessage(conversation.id, userId, dto.content);
    return this.getThread(userId, conversation.id);
  }

  // ---- Student / Parent side ----

  // Which instructors the caller may start a new conversation with — a
  // student's own roster relationships, or the union across a parent's
  // children's. Powers the "start new conversation" picker.
  async listStartableInstructors(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    const parent = student
      ? null
      : await this.prisma.parent.findUnique({ where: { userId }, include: { children: true } });
    if (!student && !parent) {
      throw new NotFoundException('پروفایل دانش‌آموز یا والد یافت نشد.');
    }

    const studentIds = student ? [student.id] : (parent?.children.map((c) => c.id) ?? []);
    if (studentIds.length === 0) return [];

    const links = await this.prisma.instructorStudent.findMany({
      where: { studentId: { in: studentIds }, status: 'ACTIVE' },
      include: { instructor: { include: { user: true } } },
    });
    const byInstructorId = new Map(links.map((l) => [l.instructorId, l.instructor.user.name]));
    return Array.from(byInstructorId, ([id, name]) => ({ id, name }));
  }

  async listForStudentOrParent(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    const parent = student ? null : await this.prisma.parent.findUnique({ where: { userId } });
    if (!student && !parent) {
      throw new NotFoundException('پروفایل دانش‌آموز یا والد یافت نشد.');
    }

    const conversations = await this.prisma.conversation.findMany({
      where: student ? { studentId: student.id } : { parentId: parent!.id },
      include: {
        instructor: { include: { user: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return this.toSummaries(conversations, userId, student ? 'STUDENT' : 'PARENT');
  }

  async startFromStudentOrParent(userId: string, dto: { instructorId: string; content: string }) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    const parent = student ? null : await this.prisma.parent.findUnique({ where: { userId } });
    if (!student && !parent) {
      throw new NotFoundException('پروفایل دانش‌آموز یا والد یافت نشد.');
    }

    let conversation;
    if (student) {
      await this.assertInstructorStudentLink(dto.instructorId, student.id, 'STUDENT');
      conversation = await this.getOrCreateConversation(dto.instructorId, { studentId: student.id });
    } else {
      await this.assertInstructorParentLink(dto.instructorId, parent!.id, 'PARENT');
      conversation = await this.getOrCreateConversation(dto.instructorId, { parentId: parent!.id });
    }

    await this.appendMessage(conversation.id, userId, dto.content);
    return this.getThread(userId, conversation.id);
  }

  // ---- Shared (any participant) ----

  async getThread(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        instructor: { include: { user: true } },
        student: { include: { user: true } },
        parent: { include: { user: true } },
      },
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد.');
    const callerKind = await this.resolveParticipant(userId, conversation);

    const otherParty =
      callerKind === 'INSTRUCTOR'
        ? conversation.student
          ? { kind: 'STUDENT' as const, name: conversation.student.user.name }
          : { kind: 'PARENT' as const, name: conversation.parent!.user.name }
        : { kind: 'INSTRUCTOR' as const, name: conversation.instructor.user.name };

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      id: conversation.id,
      otherParty,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        mine: m.senderUserId === userId,
        status: m.readAt ? ('READ' as const) : ('SENT' as const),
        createdAt: m.createdAt,
      })),
    };
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد.');
    await this.resolveParticipant(userId, conversation);

    await this.appendMessage(conversationId, userId, content);
    return this.getThread(userId, conversationId);
  }

  async markRead(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد.');
    await this.resolveParticipant(userId, conversation);

    await this.prisma.message.updateMany({
      where: { conversationId, senderUserId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  // ---- Shared summary formatting ----

  private async toSummaries(
    conversations: Array<{
      id: string;
      instructor?: { user: { name: string } };
      student?: { user: { name: string } } | null;
      parent?: { user: { name: string } } | null;
      messages: { content: string; senderUserId: string; createdAt: Date }[];
    }>,
    userId: string,
    viewerKind: ParticipantKind,
  ) {
    return Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await this.prisma.message.count({
          where: { conversationId: c.id, senderUserId: { not: userId }, readAt: null },
        });
        const lastMessage = c.messages[0] ?? null;
        const otherParty =
          viewerKind === 'INSTRUCTOR'
            ? c.student
              ? { kind: 'STUDENT' as const, name: c.student.user.name }
              : { kind: 'PARENT' as const, name: c.parent!.user.name }
            : { kind: 'INSTRUCTOR' as const, name: c.instructor!.user.name };

        return {
          id: c.id,
          otherParty,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                mine: lastMessage.senderUserId === userId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      }),
    );
  }
}

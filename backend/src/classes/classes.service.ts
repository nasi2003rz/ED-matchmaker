import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClassType, FieldType } from '../generated/prisma/enums.js';
import type { CategoryFieldDefinitionModel } from '../generated/prisma/models.js';
import type { CreateClassDto } from './dto/create-class.dto.js';
import type { UpdateClassDto } from './dto/update-class.dto.js';
import type { CreateProposalDto } from './dto/create-proposal.dto.js';
import { generateSessionDates } from './session-generator.js';
import { NOTIFICATION_EVENTS, ScheduleChangedEvent } from '../notifications/events/notification-events.js';

const CLASS_INCLUDE = {
  category: true,
  location: true,
  attributes: true,
  enrollments: { where: { status: 'ACTIVE' as const }, select: { id: true } },
} as const;

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async getInstructorId(userId: string): Promise<string> {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    return instructor.id;
  }

  async list(userId: string) {
    const instructorId = await this.getInstructorId(userId);
    const classes = await this.prisma.class.findMany({
      where: { instructorId },
      include: CLASS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return classes.map((c) => this.toDto(c));
  }

  async getOne(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const found = await this.prisma.class.findUnique({
      where: { id: classId },
      include: CLASS_INCLUDE,
    });
    if (!found) throw new NotFoundException('کلاس یافت نشد.');
    if (found.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }
    return this.toDto(found);
  }

  async create(userId: string, dto: CreateClassDto) {
    const instructorId = await this.getInstructorId(userId);
    const normalizedAttributes = await this.validateAttributes(dto.categoryId, dto.attributes);

    if (dto.locationId) await this.assertLocationExists(dto.locationId);

    const created = await this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          title: dto.name,
          description: dto.description,
          instructorId,
          categoryId: dto.categoryId,
        },
      });

      const klass = await tx.class.create({
        data: {
          courseId: course.id,
          instructorId,
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          locationId: dto.locationId,
          deliveryMode: dto.deliveryMode,
          classType: dto.classType,
          capacity: dto.capacity,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          days: dto.days ?? [],
          startTime: dto.startTime,
          endTime: dto.endTime,
          price: dto.price,
          numberOfSessions: dto.numberOfSessions,
        },
      });

      if (normalizedAttributes.length > 0) {
        await tx.classAttribute.createMany({
          data: normalizedAttributes.map((a) => ({ ...a, classId: klass.id })),
        });
      }

      if ((dto.classType ?? ClassType.GROUP) === ClassType.GROUP) {
        const occurrences = generateSessionDates({
          days: dto.days ?? [],
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          startTime: dto.startTime ?? null,
          endTime: dto.endTime ?? null,
          numberOfSessions: dto.numberOfSessions ?? null,
        });
        if (occurrences.length > 0) {
          await tx.classSession.createMany({
            data: occurrences.map((o) => ({ classId: klass.id, startsAt: o.startsAt, endsAt: o.endsAt })),
          });
        }
      }

      return klass.id;
    });

    return this.getOne(userId, created);
  }

  async update(userId: string, classId: string, dto: UpdateClassDto) {
    const instructorId = await this.getInstructorId(userId);
    const existing = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!existing) throw new NotFoundException('کلاس یافت نشد.');
    if (existing.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const effectiveCategoryId =
      dto.categoryId !== undefined ? dto.categoryId : (existing.categoryId ?? undefined);
    const normalizedAttributes =
      dto.attributes !== undefined
        ? await this.validateAttributes(effectiveCategoryId, dto.attributes)
        : undefined;

    if (dto.locationId) await this.assertLocationExists(dto.locationId);

    let scheduleChanged = false;
    await this.prisma.$transaction(async (tx) => {
      await tx.class.update({
        where: { id: classId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
          ...(dto.deliveryMode !== undefined ? { deliveryMode: dto.deliveryMode } : {}),
          ...(dto.classType !== undefined ? { classType: dto.classType } : {}),
          ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
          ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
          ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
          ...(dto.days !== undefined ? { days: dto.days } : {}),
          ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
          ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.numberOfSessions !== undefined ? { numberOfSessions: dto.numberOfSessions } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });

      if (normalizedAttributes !== undefined) {
        await tx.classAttribute.deleteMany({ where: { classId } });
        if (normalizedAttributes.length > 0) {
          await tx.classAttribute.createMany({
            data: normalizedAttributes.map((a) => ({ ...a, classId })),
          });
        }
      }

      const scheduleFieldsChanged = [
        'days',
        'startDate',
        'endDate',
        'startTime',
        'endTime',
        'numberOfSessions',
        'classType',
      ].some((key) => key in dto);
      const effectiveClassType = dto.classType ?? existing.classType;

      if (scheduleFieldsChanged) {
        scheduleChanged = true;
        const now = new Date();
        await tx.classSession.deleteMany({
          where: { classId, status: 'SCHEDULED', startsAt: { gte: now } },
        });

        if (effectiveClassType === ClassType.GROUP) {
          const occurrences = generateSessionDates({
            days: dto.days ?? existing.days,
            startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
            endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
            startTime: dto.startTime ?? existing.startTime,
            endTime: dto.endTime ?? existing.endTime,
            numberOfSessions: dto.numberOfSessions ?? existing.numberOfSessions,
          });
          if (occurrences.length > 0) {
            await tx.classSession.createMany({
              data: occurrences.map((o) => ({ classId, startsAt: o.startsAt, endsAt: o.endsAt })),
            });
          }
        }
      }
    });

    if (scheduleChanged) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { classId, status: 'ACTIVE' },
        select: { student: { select: { user: { select: { id: true } } } } },
      });
      this.eventEmitter.emit(
        NOTIFICATION_EVENTS.SCHEDULE_CHANGED,
        new ScheduleChangedEvent(
          enrollments.map((e) => e.student.user.id),
          dto.name ?? existing.name,
          classId,
        ),
      );
    }

    return this.getOne(userId, classId);
  }

  async enroll(userId: string, classId: string, studentId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { enrollments: { where: { status: 'ACTIVE' } } },
    });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const inRoster = await this.prisma.instructorStudent.findUnique({
      where: { instructorId_studentId: { instructorId, studentId } },
    });
    if (!inRoster || inRoster.status !== 'ACTIVE') {
      throw new BadRequestException('این دانش‌آموز در فهرست فعال شما نیست.');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });
    if (existing?.status === 'ACTIVE') {
      throw new ConflictException('این دانش‌آموز قبلاً در این کلاس ثبت‌نام کرده است.');
    }

    if (klass.capacity !== null && klass.enrollments.length >= klass.capacity) {
      throw new ConflictException('ظرفیت کلاس تکمیل است.');
    }

    if (existing) {
      await this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', cancelledAt: null, enrolledAt: new Date() },
      });
    } else {
      await this.prisma.enrollment.create({ data: { classId, studentId } });
    }

    return this.getOne(userId, classId);
  }

  async unenroll(userId: string, classId: string, studentId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new NotFoundException('این دانش‌آموز در این کلاس ثبت‌نام نکرده است.');
    }

    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    return this.getOne(userId, classId);
  }

  async listEnrollments(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { student: { include: { user: { include: { profile: true } } } } },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((e) => ({
      id: e.id,
      enrolledAt: e.enrolledAt,
      student: {
        id: e.student.id,
        name: e.student.user.name,
        email: e.student.user.email,
        avatarUrl: e.student.user.profile?.avatarUrl ?? null,
      },
    }));
  }

  async getInvitation(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const acceptedCount = await this.prisma.invitation.count({ where: { classId } });

    return {
      status: klass.invitationStatus,
      joinPath: `/join/class/${classId}`,
      acceptedCount,
    };
  }

  async setInvitationStatus(userId: string, classId: string, status: 'ACTIVE' | 'REVOKED') {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    await this.prisma.class.update({ where: { id: classId }, data: { invitationStatus: status } });
    return this.getInvitation(userId, classId);
  }

  async listInvitations(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const invitations = await this.prisma.invitation.findMany({
      where: { classId },
      include: { student: { include: { user: true } } },
      orderBy: { acceptedAt: 'desc' },
    });

    return invitations.map((i) => ({
      id: i.id,
      acceptedAt: i.acceptedAt,
      student: { id: i.student.id, name: i.student.user.name, email: i.student.user.email },
    }));
  }

  async listSessions(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const sessions = await this.prisma.classSession.findMany({
      where: { classId },
      orderBy: { startsAt: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
    }));
  }

  async createProposal(userId: string, classId: string, dto: CreateProposalDto) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }
    if (klass.classType !== ClassType.PRIVATE) {
      throw new BadRequestException('پیشنهاد جلسه فقط برای کلاس‌های خصوصی ممکن است.');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('زمان پایان باید بعد از زمان شروع باشد.');
    }
    if (startsAt <= new Date()) {
      throw new BadRequestException('زمان پیشنهادی باید در آینده باشد.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId: dto.studentId } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new BadRequestException('این دانش‌آموز در این کلاس ثبت‌نام نکرده است.');
    }

    const proposal = await this.prisma.sessionProposal.create({
      data: { classId, studentId: dto.studentId, startsAt, endsAt },
      include: { student: { include: { user: true } } },
    });

    return this.toProposalDto(proposal);
  }

  async listProposals(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const proposals = await this.prisma.sessionProposal.findMany({
      where: { classId },
      include: { student: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return proposals.map((p) => this.toProposalDto(p));
  }

  async cancelProposal(userId: string, classId: string, proposalId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const proposal = await this.prisma.sessionProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.classId !== classId) {
      throw new NotFoundException('پیشنهاد یافت نشد.');
    }
    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('فقط پیشنهادهای در انتظار پاسخ قابل لغو هستند.');
    }

    await this.prisma.sessionProposal.update({
      where: { id: proposalId },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    });

    return { success: true };
  }

  private toProposalDto(proposal: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    createdAt: Date;
    respondedAt: Date | null;
    student: { id: string; user: { name: string; email: string } };
  }) {
    return {
      id: proposal.id,
      startsAt: proposal.startsAt,
      endsAt: proposal.endsAt,
      status: proposal.status,
      createdAt: proposal.createdAt,
      respondedAt: proposal.respondedAt,
      student: {
        id: proposal.student.id,
        name: proposal.student.user.name,
        email: proposal.student.user.email,
      },
    };
  }

  private async assertLocationExists(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new BadRequestException('شهر انتخاب‌شده معتبر نیست.');
    }
  }

  private async validateAttributes(
    categoryId: string | null | undefined,
    attributes: Record<string, unknown> | undefined,
  ): Promise<{ fieldKey: string; value: string }[]> {
    if (!categoryId) {
      if (attributes && Object.keys(attributes).length > 0) {
        throw new BadRequestException(
          'برای ثبت فیلدهای اختصاصی ابتدا باید دسته‌بندی را انتخاب کنید.',
        );
      }
      return [];
    }

    const definitions = await this.prisma.categoryFieldDefinition.findMany({
      where: { categoryId },
    });
    const input = attributes ?? {};

    const knownKeys = new Set(definitions.map((d) => d.fieldKey));
    for (const key of Object.keys(input)) {
      if (!knownKeys.has(key)) {
        throw new BadRequestException(`فیلد «${key}» برای این دسته‌بندی تعریف نشده است.`);
      }
    }

    const result: { fieldKey: string; value: string }[] = [];
    for (const def of definitions) {
      const raw = input[def.fieldKey];
      const isEmpty = raw === undefined || raw === null || raw === '';

      if (isEmpty) {
        if (def.required) {
          throw new BadRequestException(`«${def.label}» الزامی است.`);
        }
        continue;
      }

      result.push({ fieldKey: def.fieldKey, value: this.normalizeAttributeValue(def, raw) });
    }

    return result;
  }

  private normalizeAttributeValue(def: CategoryFieldDefinitionModel, raw: unknown): string {
    switch (def.type) {
      case FieldType.TEXT:
        if (typeof raw !== 'string') {
          throw new BadRequestException(`«${def.label}» باید متن باشد.`);
        }
        return raw;
      case FieldType.NUMBER: {
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(n)) {
          throw new BadRequestException(`«${def.label}» باید عدد باشد.`);
        }
        return String(n);
      }
      case FieldType.BOOLEAN:
        if (typeof raw !== 'boolean') {
          throw new BadRequestException(`«${def.label}» باید درست/نادرست باشد.`);
        }
        return String(raw);
      case FieldType.SELECT:
        if (typeof raw !== 'string' || !def.options.includes(raw)) {
          throw new BadRequestException(
            `«${def.label}» باید یکی از مقادیر مجاز باشد: ${def.options.join('، ')}`,
          );
        }
        return raw;
      case FieldType.DATE: {
        const d = new Date(String(raw));
        if (Number.isNaN(d.getTime())) {
          throw new BadRequestException(`«${def.label}» باید یک تاریخ معتبر باشد.`);
        }
        return d.toISOString();
      }
      default:
        return String(raw);
    }
  }

  private toDto(klass: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    classType: string;
    deliveryMode: string | null;
    capacity: number | null;
    startDate: Date | null;
    endDate: Date | null;
    days: string[];
    startTime: string | null;
    endTime: string | null;
    price: number | null;
    numberOfSessions: number | null;
    category: { id: string; name: string; slug: string } | null;
    location: { id: string; city: string; province: string | null } | null;
    attributes: { fieldKey: string; value: string }[];
    enrollments: { id: string }[];
    createdAt: Date;
  }) {
    return {
      id: klass.id,
      name: klass.name,
      description: klass.description,
      status: klass.status,
      classType: klass.classType,
      deliveryMode: klass.deliveryMode,
      capacity: klass.capacity,
      startDate: klass.startDate,
      endDate: klass.endDate,
      days: klass.days,
      startTime: klass.startTime,
      endTime: klass.endTime,
      price: klass.price,
      numberOfSessions: klass.numberOfSessions,
      category: klass.category,
      location: klass.location,
      attributes: Object.fromEntries(klass.attributes.map((a) => [a.fieldKey, a.value])),
      enrolledCount: klass.enrollments.length,
      seatsLeft: klass.capacity !== null ? Math.max(klass.capacity - klass.enrollments.length, 0) : null,
      createdAt: klass.createdAt,
    };
  }
}

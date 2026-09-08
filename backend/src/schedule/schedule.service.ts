import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async listForInstructor(userId: string, from: Date, to: Date) {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    if (to <= from) {
      throw new BadRequestException('بازه‌ی زمانی نامعتبر است.');
    }

    const sessions = await this.prisma.classSession.findMany({
      where: {
        class: { instructorId: instructor.id },
        startsAt: { gte: from, lt: to },
        status: { not: 'CANCELLED' },
      },
      include: { class: { include: { location: true } } },
      orderBy: { startsAt: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      class: {
        id: s.class.id,
        name: s.class.name,
        classType: s.class.classType,
        location: s.class.location ? { city: s.class.location.city } : null,
      },
    }));
  }

  // Student's own calendar (Step 20 fix): mirrors listForInstructor's
  // shape (no per-child tagging needed — a student only ever sees their
  // own sessions) via the student's active enrollments.
  async listForStudent(userId: string, from: Date, to: Date) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد.');
    }
    if (to <= from) {
      throw new BadRequestException('بازه‌ی زمانی نامعتبر است.');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      select: { classId: true },
    });
    if (enrollments.length === 0) return [];

    const sessions = await this.prisma.classSession.findMany({
      where: {
        classId: { in: enrollments.map((e) => e.classId) },
        startsAt: { gte: from, lt: to },
        status: { not: 'CANCELLED' },
      },
      include: { class: { include: { location: true } } },
      orderBy: { startsAt: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      class: {
        id: s.class.id,
        name: s.class.name,
        classType: s.class.classType,
        location: s.class.location ? { city: s.class.location.city } : null,
      },
    }));
  }

  // Family calendar (CLAUDE.md Section 5.2, Step 17): every child's
  // sessions in one combined view, each tagged with which child it
  // belongs to — the whole point of a "family" calendar over a per-child
  // one.
  async listForParent(userId: string, from: Date, to: Date) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      include: { children: { include: { user: true } } },
    });
    if (!parent) {
      throw new NotFoundException('پروفایل والد یافت نشد.');
    }
    if (to <= from) {
      throw new BadRequestException('بازه‌ی زمانی نامعتبر است.');
    }
    if (parent.children.length === 0) return [];

    const nameByStudentId = new Map(parent.children.map((c) => [c.id, c.user.name]));
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: { in: parent.children.map((c) => c.id) }, status: 'ACTIVE' },
      select: { studentId: true, classId: true },
    });
    if (enrollments.length === 0) return [];

    const sessions = await this.prisma.classSession.findMany({
      where: {
        classId: { in: enrollments.map((e) => e.classId) },
        startsAt: { gte: from, lt: to },
        status: { not: 'CANCELLED' },
      },
      include: { class: { include: { location: true } } },
      orderBy: { startsAt: 'asc' },
    });

    // Fan each session out per enrolled child (a session's class may be
    // shared by more than one sibling).
    const classIdToStudentIds = new Map<string, string[]>();
    for (const e of enrollments) {
      const list = classIdToStudentIds.get(e.classId) ?? [];
      list.push(e.studentId);
      classIdToStudentIds.set(e.classId, list);
    }

    return sessions.flatMap((s) =>
      (classIdToStudentIds.get(s.classId) ?? []).map((studentId) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: s.status,
        student: { id: studentId, name: nameByStudentId.get(studentId)! },
        class: {
          id: s.class.id,
          name: s.class.name,
          classType: s.class.classType,
          location: s.class.location ? { city: s.class.location.city } : null,
        },
      })),
    );
  }
}

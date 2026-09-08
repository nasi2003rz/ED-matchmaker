import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { GradesService } from '../grades/grades.service.js';
import { ConversationsService } from '../messaging/conversations.service.js';

function toSessionDto(session: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  class: { id: string; name: string };
}) {
  return {
    id: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    class: { id: session.class.id, name: session.class.name },
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentsService: AssignmentsService,
    private readonly gradesService: GradesService,
    private readonly conversationsService: ConversationsService,
  ) {}

  // "چه چیزی امروز دارم؟" (CLAUDE.md Section 5.2): reuses the existing
  // Homework/Grades/Messaging services (Section 12 — reuse infrastructure,
  // don't duplicate it) and adds only what's genuinely new here: the
  // student's own next-class / today's-classes view (no student-facing
  // schedule endpoint existed before this step).
  async getStudentDashboard(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('پروفایل دانش‌آموز یافت نشد.');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const [todaySessions, nextSession, homework, grades, conversations] = await Promise.all([
      classIds.length === 0
        ? []
        : this.prisma.classSession.findMany({
            where: {
              classId: { in: classIds },
              status: { not: 'CANCELLED' },
              startsAt: { gte: startOfToday, lt: startOfTomorrow },
            },
            include: { class: { select: { id: true, name: true } } },
            orderBy: { startsAt: 'asc' },
          }),
      classIds.length === 0
        ? null
        : this.prisma.classSession.findFirst({
            where: {
              classId: { in: classIds },
              status: { not: 'CANCELLED' },
              startsAt: { gte: now },
            },
            include: { class: { select: { id: true, name: true } } },
            orderBy: { startsAt: 'asc' },
          }),
      this.assignmentsService.listMine(userId),
      this.gradesService.listMine(userId),
      this.conversationsService.listForStudentOrParent(userId),
    ]);

    const pendingHomework = homework.filter((h) => h.status === 'ASSIGNED' || h.status === 'MISSING');
    const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return {
      nextSession: nextSession ? toSessionDto(nextSession) : null,
      todaySessions: todaySessions.map(toSessionDto),
      pendingHomework: pendingHomework.slice(0, 5),
      pendingHomeworkCount: pendingHomework.length,
      recentGrades: grades.slice(0, 5),
      unreadMessagesCount,
    };
  }
}

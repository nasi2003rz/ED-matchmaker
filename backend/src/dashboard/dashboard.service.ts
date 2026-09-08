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

  // Shared by both dashboards below: a given student's next session and
  // today's sessions, across their own active enrollments.
  private async getScheduleSummary(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);
    if (classIds.length === 0) return { nextSession: null, todaySessions: [] };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const [todaySessions, nextSession] = await Promise.all([
      this.prisma.classSession.findMany({
        where: {
          classId: { in: classIds },
          status: { not: 'CANCELLED' },
          startsAt: { gte: startOfToday, lt: startOfTomorrow },
        },
        include: { class: { select: { id: true, name: true } } },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.classSession.findFirst({
        where: { classId: { in: classIds }, status: { not: 'CANCELLED' }, startsAt: { gte: now } },
        include: { class: { select: { id: true, name: true } } },
        orderBy: { startsAt: 'asc' },
      }),
    ]);

    return {
      nextSession: nextSession ? toSessionDto(nextSession) : null,
      todaySessions: todaySessions.map(toSessionDto),
    };
  }

  // "چه چیزی امروز دارم؟" (CLAUDE.md Section 5.2): reuses the existing
  // Homework/Grades/Messaging services (Section 12 — reuse infrastructure,
  // don't duplicate it) and adds only what's genuinely new here: the
  // student's own next-class / today's-classes view (no student-facing
  // schedule endpoint existed before this step).
  async getStudentDashboard(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('پروفایل دانش‌آموز یافت نشد.');

    const [schedule, homework, grades, conversations] = await Promise.all([
      this.getScheduleSummary(student.id),
      this.assignmentsService.listMine(userId),
      this.gradesService.listMine(userId),
      this.conversationsService.listForStudentOrParent(userId),
    ]);

    const pendingHomework = homework.filter((h) => h.status === 'ASSIGNED' || h.status === 'MISSING');
    const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return {
      nextSession: schedule.nextSession,
      todaySessions: schedule.todaySessions,
      pendingHomework: pendingHomework.slice(0, 5),
      pendingHomeworkCount: pendingHomework.length,
      recentGrades: grades.slice(0, 5),
      unreadMessagesCount,
    };
  }

  // "چه چیزی بچه‌هایم امروز دارند؟" (CLAUDE.md Section 5.2: "multiple
  // children, switch between them") — one summary per child, plus the
  // parent's own message inbox (Conversations are parent-level, not
  // per-child — Step 14). Per-child homework/grades reuse the same
  // services as the student dashboard via their studentId-keyed variants.
  async getParentDashboard(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      include: { children: { include: { user: true } } },
    });
    if (!parent) throw new NotFoundException('پروفایل والد یافت نشد.');

    const [children, conversations] = await Promise.all([
      Promise.all(
        parent.children.map(async (child) => {
          const [schedule, homework, grades] = await Promise.all([
            this.getScheduleSummary(child.id),
            this.assignmentsService.listForStudent(child.id),
            this.gradesService.listForStudent(child.id),
          ]);
          const pendingHomeworkCount = homework.filter(
            (h) => h.status === 'ASSIGNED' || h.status === 'MISSING',
          ).length;

          return {
            id: child.id,
            name: child.user.name,
            nextSession: schedule.nextSession,
            todaySessions: schedule.todaySessions,
            pendingHomeworkCount,
            recentGrades: grades.slice(0, 3),
          };
        }),
      ),
      this.conversationsService.listForStudentOrParent(userId),
    ]);

    const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return { children, unreadMessagesCount };
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AttendanceStatus } from '../generated/prisma/enums.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async getInstructorId(userId: string): Promise<string> {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    return instructor.id;
  }

  private async getOwnedSession(userId: string, classId: string, sessionId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const session = await this.prisma.classSession.findUnique({ where: { id: sessionId } });
    if (!session || session.classId !== classId) {
      throw new NotFoundException('جلسه یافت نشد.');
    }

    return { instructorId, session };
  }

  async getSessionAttendance(userId: string, classId: string, sessionId: string) {
    await this.getOwnedSession(userId, classId, sessionId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { student: { include: { user: true } } },
      orderBy: { enrolledAt: 'asc' },
    });

    const attendances = await this.prisma.attendance.findMany({ where: { sessionId } });
    const statusByStudentId = new Map(attendances.map((a) => [a.studentId, a.status]));

    return enrollments.map((e) => ({
      student: { id: e.student.id, name: e.student.user.name, email: e.student.user.email },
      status: statusByStudentId.get(e.student.id) ?? null,
    }));
  }

  async markAttendance(
    userId: string,
    classId: string,
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
  ) {
    await this.getOwnedSession(userId, classId, sessionId);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new BadRequestException('این دانش‌آموز در این کلاس ثبت‌نام نکرده است.');
    }

    await this.prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId } },
      update: { status, markedAt: new Date() },
      create: { sessionId, studentId, status },
    });

    return this.getSessionAttendance(userId, classId, sessionId);
  }

  async getClassAttendanceSummary(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { student: { include: { user: true } } },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { session: { classId } },
    });

    const perStudent = enrollments.map((e) => {
      const own = attendances.filter((a) => a.studentId === e.student.id);
      const countable = own.filter((a) => a.status !== 'EXCUSED');
      const present = countable.filter((a) => a.status === 'PRESENT').length;
      const rate = countable.length > 0 ? present / countable.length : null;
      return {
        student: { id: e.student.id, name: e.student.user.name, email: e.student.user.email },
        markedCount: own.length,
        rate,
      };
    });

    const allCountable = attendances.filter((a) => a.status !== 'EXCUSED');
    const allPresent = allCountable.filter((a) => a.status === 'PRESENT').length;
    const overallRate = allCountable.length > 0 ? allPresent / allCountable.length : null;

    return { overallRate, perStudent };
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { GradeType } from '../generated/prisma/enums.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';
import { NOTIFICATION_EVENTS, GradeCreatedEvent } from '../notifications/events/notification-events.js';

const LETTER_PATTERN = /^[A-DFa-df][+-]?$/;

function assertValueMatchesType(type: GradeType, value: string) {
  switch (type) {
    case GradeType.NUMERIC:
      if (Number.isNaN(Number(value))) {
        throw new BadRequestException('برای نمره‌ی عددی، مقدار باید یک عدد باشد.');
      }
      break;
    case GradeType.LETTER:
      if (!LETTER_PATTERN.test(value.trim())) {
        throw new BadRequestException('نمره‌ی حرفی باید یکی از A تا F باشد (با + یا - اختیاری).');
      }
      break;
    case GradeType.PASS_FAIL:
      if (value !== 'PASS' && value !== 'FAIL') {
        throw new BadRequestException('نمره‌ی قبول‌ردی باید PASS یا FAIL باشد.');
      }
      break;
    case GradeType.TEXT:
      // any non-empty text is valid — already enforced by the DTO.
      break;
  }
}

@Injectable()
export class GradesService {
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

  private async getStudentId(userId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد.');
    }
    return student.id;
  }

  private async getOwnedClass(userId: string, classId: string) {
    const instructorId = await this.getInstructorId(userId);
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('کلاس یافت نشد.');
    if (klass.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این کلاس دسترسی ندارید.');
    }
    return klass;
  }

  private async getOwnedGrade(userId: string, classId: string, gradeId: string) {
    await this.getOwnedClass(userId, classId);
    const grade = await this.prisma.grade.findUnique({ where: { id: gradeId } });
    if (!grade || grade.classId !== classId) {
      throw new NotFoundException('نمره یافت نشد.');
    }
    return grade;
  }

  // ---- Instructor side ----

  async create(userId: string, classId: string, dto: CreateGradeDto) {
    const klass = await this.getOwnedClass(userId, classId);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId: dto.studentId } },
      include: { student: { select: { userId: true } } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new BadRequestException('این دانش‌آموز در این کلاس ثبت‌نام نکرده است.');
    }
    assertValueMatchesType(dto.type, dto.value);

    const grade = await this.prisma.grade.create({
      data: {
        classId,
        studentId: dto.studentId,
        title: dto.title,
        type: dto.type,
        value: dto.value,
        note: dto.note,
      },
    });

    this.eventEmitter.emit(
      NOTIFICATION_EVENTS.GRADE_CREATED,
      new GradeCreatedEvent(enrollment.student.userId, grade.title, klass.name, classId),
    );

    return grade;
  }

  async update(userId: string, classId: string, gradeId: string, dto: UpdateGradeDto) {
    const grade = await this.getOwnedGrade(userId, classId, gradeId);
    const type = dto.type ?? grade.type;
    const value = dto.value ?? grade.value;
    assertValueMatchesType(type, value);

    return this.prisma.grade.update({
      where: { id: gradeId },
      data: { title: dto.title, type: dto.type, value: dto.value, note: dto.note },
    });
  }

  async remove(userId: string, classId: string, gradeId: string) {
    await this.getOwnedGrade(userId, classId, gradeId);
    await this.prisma.grade.delete({ where: { id: gradeId } });
    return { success: true };
  }

  async listForClass(userId: string, classId: string) {
    await this.getOwnedClass(userId, classId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { student: { include: { user: true } } },
      orderBy: { enrolledAt: 'asc' },
    });
    const grades = await this.prisma.grade.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });
    const byStudentId = new Map<string, typeof grades>();
    for (const g of grades) {
      const list = byStudentId.get(g.studentId) ?? [];
      list.push(g);
      byStudentId.set(g.studentId, list);
    }

    return enrollments.map((e) => ({
      student: { id: e.student.id, name: e.student.user.name, email: e.student.user.email },
      grades: (byStudentId.get(e.student.id) ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        value: g.value,
        note: g.note,
        createdAt: g.createdAt,
      })),
    }));
  }

  // ---- Student side ----

  async listMine(userId: string) {
    const studentId = await this.getStudentId(userId);
    return this.listForStudent(studentId);
  }

  // Reusable by a parent's per-child dashboard view (Step 17).
  async listForStudent(studentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return grades.map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      value: g.value,
      note: g.note,
      createdAt: g.createdAt,
      class: g.class,
    }));
  }
}

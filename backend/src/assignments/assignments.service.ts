import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';

type HomeworkStatus = 'ASSIGNED' | 'SUBMITTED' | 'LATE' | 'REVIEWED' | 'MISSING';

function deriveStatus(dueAt: Date | null, submission: { submittedAt: Date; reviewedAt: Date | null } | undefined): HomeworkStatus {
  if (submission) {
    if (submission.reviewedAt) return 'REVIEWED';
    if (dueAt && submission.submittedAt > dueAt) return 'LATE';
    return 'SUBMITTED';
  }
  if (dueAt && dueAt < new Date()) return 'MISSING';
  return 'ASSIGNED';
}

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async getOwnedAssignment(userId: string, classId: string, assignmentId: string) {
    await this.getOwnedClass(userId, classId);
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.classId !== classId) {
      throw new NotFoundException('تکلیف یافت نشد.');
    }
    return assignment;
  }

  // ---- Instructor side ----

  async create(userId: string, classId: string, dto: CreateAssignmentDto) {
    await this.getOwnedClass(userId, classId);
    const assignment = await this.prisma.assignment.create({
      data: {
        classId,
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
    });
    return assignment;
  }

  async update(userId: string, classId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    await this.getOwnedAssignment(userId, classId, assignmentId);
    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt !== undefined ? (dto.dueAt ? new Date(dto.dueAt) : null) : undefined,
      },
    });
  }

  async listForClass(userId: string, classId: string) {
    await this.getOwnedClass(userId, classId);
    const assignments = await this.prisma.assignment.findMany({
      where: { classId },
      include: { submissions: true },
      orderBy: { createdAt: 'desc' },
    });
    const activeCount = await this.prisma.enrollment.count({ where: { classId, status: 'ACTIVE' } });

    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueAt: a.dueAt,
      createdAt: a.createdAt,
      studentCount: activeCount,
      submittedCount: a.submissions.length,
      reviewedCount: a.submissions.filter((s) => s.reviewedAt).length,
    }));
  }

  async getDetail(userId: string, classId: string, assignmentId: string) {
    const assignment = await this.getOwnedAssignment(userId, classId, assignmentId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { student: { include: { user: true } } },
      orderBy: { enrolledAt: 'asc' },
    });
    const submissions = await this.prisma.submission.findMany({ where: { assignmentId } });
    const byStudentId = new Map(submissions.map((s) => [s.studentId, s]));

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.dueAt,
      students: enrollments.map((e) => {
        const submission = byStudentId.get(e.student.id);
        return {
          student: { id: e.student.id, name: e.student.user.name, email: e.student.user.email },
          status: deriveStatus(assignment.dueAt, submission),
          submission: submission
            ? {
                content: submission.content,
                submittedAt: submission.submittedAt,
                score: submission.score,
                feedback: submission.feedback,
                reviewedAt: submission.reviewedAt,
              }
            : null,
        };
      }),
    };
  }

  async reviewSubmission(
    userId: string,
    classId: string,
    assignmentId: string,
    studentId: string,
    score: number | undefined,
    feedback: string | undefined,
  ) {
    await this.getOwnedAssignment(userId, classId, assignmentId);
    const submission = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (!submission) {
      throw new BadRequestException('دانش‌آموز هنوز تکلیف را ارسال نکرده است.');
    }

    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { score, feedback, reviewedAt: new Date() },
    });

    return this.getDetail(userId, classId, assignmentId);
  }

  // ---- Student side ----

  async listMine(userId: string) {
    const studentId = await this.getStudentId(userId);
    return this.listForStudent(studentId);
  }

  // Reusable by a parent's per-child dashboard view (Step 17) — same query,
  // keyed directly off a known studentId instead of resolving it from the
  // caller's own userId.
  async listForStudent(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);
    if (classIds.length === 0) return [];

    const assignments = await this.prisma.assignment.findMany({
      where: { classId: { in: classIds } },
      include: {
        class: { select: { id: true, name: true } },
        submissions: { where: { studentId } },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });

    return assignments.map((a) => {
      const submission = a.submissions[0];
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueAt: a.dueAt,
        class: a.class,
        status: deriveStatus(a.dueAt, submission),
        submission: submission
          ? {
              content: submission.content,
              submittedAt: submission.submittedAt,
              score: submission.score,
              feedback: submission.feedback,
              reviewedAt: submission.reviewedAt,
            }
          : null,
      };
    });
  }

  async submit(userId: string, assignmentId: string, content: string) {
    const studentId = await this.getStudentId(userId);
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('تکلیف یافت نشد.');

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId: assignment.classId, studentId } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new ForbiddenException('شما در این کلاس ثبت‌نام نکرده‌اید.');
    }

    const existing = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (existing?.reviewedAt) {
      throw new BadRequestException('این تکلیف قبلاً بررسی شده و دیگر قابل ویرایش نیست.');
    }

    await this.prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: { content, submittedAt: new Date() },
      create: { assignmentId, studentId, content },
    });

    const submission = await this.prisma.submission.findUniqueOrThrow({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.dueAt,
      status: deriveStatus(assignment.dueAt, submission),
      submission: {
        content: submission.content,
        submittedAt: submission.submittedAt,
        score: submission.score,
        feedback: submission.feedback,
        reviewedAt: submission.reviewedAt,
      },
    };
  }
}

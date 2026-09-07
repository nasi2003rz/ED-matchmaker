import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getInstructorId(userId: string): Promise<string> {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    return instructor.id;
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

  // ---- Instructor side ----

  async create(userId: string, classId: string, dto: CreateAnnouncementDto) {
    await this.getOwnedClass(userId, classId);
    return this.prisma.announcement.create({ data: { classId, content: dto.content } });
  }

  async listForClass(userId: string, classId: string) {
    await this.getOwnedClass(userId, classId);
    return this.prisma.announcement.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- Student / Parent side ----

  private async getStudentClassIds(studentId: string): Promise<string[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { classId: true },
    });
    return enrollments.map((e) => e.classId);
  }

  async listForStudent(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('پروفایل دانش‌آموز یافت نشد.');
    const classIds = await this.getStudentClassIds(student.id);
    return this.listForClasses(classIds);
  }

  async listForParent(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      include: { children: true },
    });
    if (!parent) throw new NotFoundException('پروفایل والد یافت نشد.');
    const classIdLists = await Promise.all(
      parent.children.map((c) => this.getStudentClassIds(c.id)),
    );
    return this.listForClasses([...new Set(classIdLists.flat())]);
  }

  private async listForClasses(classIds: string[]) {
    if (classIds.length === 0) return [];
    const announcements = await this.prisma.announcement.findMany({
      where: { classId: { in: classIds } },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return announcements;
  }
}

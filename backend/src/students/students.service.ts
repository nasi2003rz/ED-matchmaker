import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RosterStatus } from '../generated/prisma/enums.js';
import type { UpdateRosterEntryDto } from './dto/update-roster-entry.dto.js';

const ROSTER_INCLUDE = {
  student: { include: { user: { include: { profile: true } } } },
} as const;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getInstructorId(userId: string): Promise<string> {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    return instructor.id;
  }

  async listRoster(userId: string, status: RosterStatus = RosterStatus.ACTIVE) {
    const instructorId = await this.getInstructorId(userId);
    const roster = await this.prisma.instructorStudent.findMany({
      where: { instructorId, status },
      include: ROSTER_INCLUDE,
      orderBy: { addedAt: 'desc' },
    });
    return roster.map(this.toDto);
  }

  async addStudent(userId: string, email: string) {
    const instructorId = await this.getInstructorId(userId);

    const targetUser = await this.prisma.user.findUnique({
      where: { email },
      include: { student: true },
    });

    if (!targetUser || !targetUser.student) {
      throw new BadRequestException(
        'کاربری با این ایمیل که نقش دانش‌آموز داشته باشد پیدا نشد.',
      );
    }

    const existing = await this.prisma.instructorStudent.findUnique({
      where: {
        instructorId_studentId: { instructorId, studentId: targetUser.student.id },
      },
    });
    if (existing) {
      throw new ConflictException('این دانش‌آموز قبلاً به فهرست شما اضافه شده است.');
    }

    const created = await this.prisma.instructorStudent.create({
      data: { instructorId, studentId: targetUser.student.id },
      include: ROSTER_INCLUDE,
    });
    return this.toDto(created);
  }

  async updateRosterEntry(userId: string, rosterId: string, dto: UpdateRosterEntryDto) {
    const instructorId = await this.getInstructorId(userId);

    const entry = await this.prisma.instructorStudent.findUnique({ where: { id: rosterId } });
    if (!entry) {
      throw new NotFoundException('این دانش‌آموز در فهرست شما یافت نشد.');
    }
    if (entry.instructorId !== instructorId) {
      throw new ForbiddenException('شما به این رکورد دسترسی ندارید.');
    }

    const updated = await this.prisma.instructorStudent.update({
      where: { id: rosterId },
      data: {
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              archivedAt: dto.status === RosterStatus.ARCHIVED ? new Date() : null,
            }
          : {}),
      },
      include: ROSTER_INCLUDE,
    });
    return this.toDto(updated);
  }

  private toDto(entry: {
    id: string;
    status: RosterStatus;
    note: string | null;
    addedAt: Date;
    archivedAt: Date | null;
    student: {
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        profile: { avatarUrl: string | null; phone: string | null } | null;
      };
    };
  }) {
    return {
      id: entry.id,
      status: entry.status,
      note: entry.note,
      addedAt: entry.addedAt,
      archivedAt: entry.archivedAt,
      student: {
        id: entry.student.id,
        name: entry.student.user.name,
        email: entry.student.user.email,
        avatarUrl: entry.student.user.profile?.avatarUrl ?? null,
        phone: entry.student.user.profile?.phone ?? null,
      },
    };
  }
}

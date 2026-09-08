import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// A parent links an *existing* Student account by email (CLAUDE.md
// doesn't specify this mechanism — the Instructor roster's "add by email"
// from Step 7 is the closest existing precedent, so this mirrors it: no
// child-side confirmation step, same Phase 1 simplification already
// accepted there).
@Injectable()
export class ChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  private async getParentId(userId: string): Promise<string> {
    const parent = await this.prisma.parent.findUnique({ where: { userId } });
    if (!parent) {
      throw new NotFoundException('پروفایل والد یافت نشد.');
    }
    return parent.id;
  }

  async listChildren(userId: string) {
    const parentId = await this.getParentId(userId);
    const children = await this.prisma.student.findMany({
      where: { parentId },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return children.map((c) => this.toDto(c));
  }

  async linkChild(userId: string, email: string) {
    const parentId = await this.getParentId(userId);

    const targetUser = await this.prisma.user.findUnique({
      where: { email },
      include: { student: true },
    });
    if (!targetUser || !targetUser.student) {
      throw new BadRequestException('کاربری با این ایمیل که نقش دانش‌آموز داشته باشد پیدا نشد.');
    }

    const student = targetUser.student;
    if (student.parentId && student.parentId !== parentId) {
      throw new ConflictException('این دانش‌آموز قبلاً به والد دیگری متصل است.');
    }
    if (student.parentId === parentId) {
      throw new ConflictException('این دانش‌آموز قبلاً به فهرست فرزندان شما اضافه شده است.');
    }

    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: { parentId },
      include: { user: { include: { profile: true } } },
    });
    return this.toDto(updated);
  }

  async unlinkChild(userId: string, studentId: string) {
    const parentId = await this.getParentId(userId);
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.parentId !== parentId) {
      throw new NotFoundException('این دانش‌آموز در فهرست فرزندان شما نیست.');
    }

    await this.prisma.student.update({ where: { id: studentId }, data: { parentId: null } });
    return { success: true };
  }

  private toDto(student: {
    id: string;
    user: {
      name: string;
      email: string;
      profile: { avatarUrl: string | null } | null;
    };
  }) {
    return {
      id: student.id,
      name: student.user.name,
      email: student.user.email,
      avatarUrl: student.user.profile?.avatarUrl ?? null,
    };
  }
}

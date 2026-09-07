import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { InstructorGetPayload } from '../generated/prisma/models.js';
import type { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto.js';

const INSTRUCTOR_INCLUDE = {
  location: true,
  categories: { include: { category: true } },
  user: { include: { profile: true } },
} as const;

@Injectable()
export class InstructorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { userId },
      include: INSTRUCTOR_INCLUDE,
    });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    return this.toDto(instructor);
  }

  async updateMe(userId: string, dto: UpdateInstructorProfileDto) {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.phone !== undefined || dto.bio !== undefined) {
        await tx.profile.update({
          where: { userId },
          data: {
            ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
            ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
          },
        });
      }

      await tx.instructor.update({
        where: { userId },
        data: {
          ...(dto.experienceYears !== undefined ? { experienceYears: dto.experienceYears } : {}),
          ...(dto.deliveryMode !== undefined ? { deliveryMode: dto.deliveryMode } : {}),
          ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
          ...(dto.subjects !== undefined ? { subjects: dto.subjects } : {}),
        },
      });

      if (dto.categoryIds !== undefined) {
        await tx.instructorCategory.deleteMany({ where: { instructorId: instructor.id } });
        if (dto.categoryIds.length > 0) {
          await tx.instructorCategory.createMany({
            data: dto.categoryIds.map((categoryId) => ({
              instructorId: instructor.id,
              categoryId,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.getMe(userId);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    await this.prisma.profile.update({ where: { userId }, data: { avatarUrl } });
    return this.getMe(userId);
  }

  private toDto(
    instructor: InstructorGetPayload<{ include: typeof INSTRUCTOR_INCLUDE }>,
  ) {
    return {
      id: instructor.id,
      experienceYears: instructor.experienceYears,
      deliveryMode: instructor.deliveryMode,
      subjects: instructor.subjects,
      location: instructor.location,
      categories: instructor.categories.map((c) => c.category),
      phone: instructor.user.profile?.phone ?? null,
      bio: instructor.user.profile?.bio ?? null,
      avatarUrl: instructor.user.profile?.avatarUrl ?? null,
    };
  }
}

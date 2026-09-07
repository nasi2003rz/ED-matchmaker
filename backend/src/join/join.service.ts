import { BadRequestException, ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { RoleName } from '../generated/prisma/enums.js';

const PREVIEW_INCLUDE = {
  category: true,
  location: true,
  instructor: { include: { user: true } },
} as const;

@Injectable()
export class JoinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async preview(classId: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: PREVIEW_INCLUDE,
    });
    if (!klass) {
      throw new NotFoundException('این کلاس یافت نشد.');
    }

    const joinable =
      klass.invitationStatus === 'ACTIVE' &&
      !['CANCELLED', 'ARCHIVED', 'COMPLETED'].includes(klass.status);

    return {
      id: klass.id,
      name: klass.name,
      description: klass.description,
      status: klass.status,
      instructorName: klass.instructor.user.name,
      category: klass.category,
      location: klass.location,
      deliveryMode: klass.deliveryMode,
      days: klass.days,
      startTime: klass.startTime,
      endTime: klass.endTime,
      price: klass.price,
      joinable,
    };
  }

  async accept(userId: string, classId: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { enrollments: { where: { status: 'ACTIVE' } } },
    });
    if (!klass) {
      throw new NotFoundException('این کلاس یافت نشد.');
    }
    if (klass.invitationStatus === 'REVOKED') {
      throw new GoneException('این دعوت‌نامه دیگر معتبر نیست.');
    }
    if (['CANCELLED', 'ARCHIVED', 'COMPLETED'].includes(klass.status)) {
      throw new BadRequestException('این کلاس دیگر فعال نیست.');
    }

    await this.usersService.assignRole(userId, RoleName.STUDENT);
    const student = await this.prisma.student.findUniqueOrThrow({ where: { userId } });

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { classId_studentId: { classId, studentId: student.id } },
    });

    if (!existingEnrollment || existingEnrollment.status !== 'ACTIVE') {
      if (klass.capacity !== null && klass.enrollments.length >= klass.capacity) {
        throw new ConflictException('ظرفیت کلاس تکمیل است.');
      }
    }

    await this.prisma.$transaction([
      this.prisma.instructorStudent.upsert({
        where: {
          instructorId_studentId: { instructorId: klass.instructorId, studentId: student.id },
        },
        update: {},
        create: { instructorId: klass.instructorId, studentId: student.id },
      }),
      existingEnrollment
        ? this.prisma.enrollment.update({
            where: { id: existingEnrollment.id },
            data: { status: 'ACTIVE', cancelledAt: null, enrolledAt: new Date() },
          })
        : this.prisma.enrollment.create({ data: { classId, studentId: student.id } }),
      this.prisma.invitation.upsert({
        where: { classId_studentId: { classId, studentId: student.id } },
        update: { acceptedAt: new Date() },
        create: { classId, studentId: student.id },
      }),
    ]);

    return { classId, joined: true };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async listForInstructor(userId: string, from: Date, to: Date) {
    const instructor = await this.prisma.instructor.findUnique({ where: { userId } });
    if (!instructor) {
      throw new NotFoundException('پروفایل مربی یافت نشد.');
    }
    if (to <= from) {
      throw new BadRequestException('بازه‌ی زمانی نامعتبر است.');
    }

    const sessions = await this.prisma.classSession.findMany({
      where: {
        class: { instructorId: instructor.id },
        startsAt: { gte: from, lt: to },
        status: { not: 'CANCELLED' },
      },
      include: { class: { include: { location: true } } },
      orderBy: { startsAt: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      class: {
        id: s.class.id,
        name: s.class.name,
        classType: s.class.classType,
        location: s.class.location ? { city: s.class.location.city } : null,
      },
    }));
  }
}

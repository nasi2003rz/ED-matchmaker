import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType } from '../generated/prisma/enums.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // The one place any row in `notifications` gets written — every producer
  // goes through this, whether triggered by a domain event (NotificationsListener)
  // or the reminder cron (ReminderService), never by writing to Prisma directly.
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    options: { body?: string; link?: string } = {},
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, body: options.body, link: options.link },
    });
  }

  async createMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    options: { body?: string; link?: string } = {},
  ) {
    if (userIds.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        body: options.body,
        link: options.link,
      })),
    });
  }

  async listMine(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('اعلان یافت نشد.');
    }
    if (notification.readAt) return notification;

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}

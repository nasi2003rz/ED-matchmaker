import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationType } from '../generated/prisma/enums.js';

const CLASS_REMINDER_WINDOW_MINUTES = 60;
const PAYMENT_REMINDER_WINDOW_HOURS = 24;

// The two "reminder" notification types from CLAUDE.md Section 5.2 are
// time-based, not triggered by a user action — there's no event to listen
// for, so this runs on its own schedule instead of going through
// NotificationsListener. `reminderSentAt` on ClassSession/Payment keeps a
// tick from re-sending the same reminder.
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 */15 * * * *') // every 15 minutes — no EVERY_15_MINUTES in CronExpression
  async sendClassReminders() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + CLASS_REMINDER_WINDOW_MINUTES * 60 * 1000);

    const sessions = await this.prisma.classSession.findMany({
      where: {
        status: 'SCHEDULED',
        startsAt: { gte: now, lte: windowEnd },
        reminderSentAt: null,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: { student: { select: { user: { select: { id: true } } } } },
            },
          },
        },
      },
    });

    for (const session of sessions) {
      const userIds = session.class.enrollments.map((e) => e.student.user.id);
      await this.notificationsService.createMany(
        userIds,
        NotificationType.CLASS_REMINDER,
        `«${session.class.name}» تا کمتر از یک ساعت دیگر شروع می‌شود.`,
        { link: '/home' },
      );
      await this.prisma.classSession.update({
        where: { id: session.id },
        data: { reminderSentAt: now },
      });
    }

    if (sessions.length > 0) {
      this.logger.log(`Sent class reminders for ${sessions.length} session(s).`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendPaymentReminders() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + PAYMENT_REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

    const payments = await this.prisma.payment.findMany({
      where: {
        dueDate: { not: null, lte: windowEnd },
        reminderSentAt: null,
      },
      include: { class: { select: { name: true } }, student: { select: { user: true } } },
    });

    for (const payment of payments) {
      // Already fully paid — stamp it anyway so it drops out of future
      // runs' query instead of being re-checked every hour forever.
      if (payment.paidAmount >= payment.amount) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { reminderSentAt: now },
        });
        continue;
      }

      await this.notificationsService.create(
        payment.student.user.id,
        NotificationType.PAYMENT_REMINDER,
        `فیش «${payment.title}» برای «${payment.class.name}» نزدیک سررسید است.`,
        { link: '/payments' },
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { reminderSentAt: now },
      });
    }

    if (payments.length > 0) {
      this.logger.log(`Checked payment reminders for ${payments.length} invoice(s).`);
    }
  }
}

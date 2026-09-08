import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service.js';
import { NotificationType } from '../generated/prisma/enums.js';
import {
  NOTIFICATION_EVENTS,
  InvitationAcceptedEvent,
  AssignmentCreatedEvent,
  AssignmentReviewedEvent,
  GradeCreatedEvent,
  ScheduleChangedEvent,
  MessageNewEvent,
} from './events/notification-events.js';

// The only consumer of the events in ./events — this is what makes
// NotificationsService "not tightly coupled to individual modules"
// (CLAUDE.md Section 5.2): a producer emits a plain event and never needs
// to import this module at all.
@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(NOTIFICATION_EVENTS.INVITATION_ACCEPTED)
  async onInvitationAccepted(event: InvitationAcceptedEvent) {
    await this.notificationsService.create(
      event.instructorUserId,
      NotificationType.INVITATION_ACCEPTED,
      `${event.studentName} از طریق لینک دعوت به «${event.className}» پیوست.`,
      { link: `/classes/${event.classId}` },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.ASSIGNMENT_CREATED)
  async onAssignmentCreated(event: AssignmentCreatedEvent) {
    await this.notificationsService.createMany(
      event.studentUserIds,
      NotificationType.NEW_ASSIGNMENT,
      `تکلیف جدید در «${event.className}»: ${event.title}`,
      { link: '/homework' },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.ASSIGNMENT_REVIEWED)
  async onAssignmentReviewed(event: AssignmentReviewedEvent) {
    await this.notificationsService.create(
      event.studentUserId,
      NotificationType.ASSIGNMENT_REVIEWED,
      `تکلیف «${event.title}» بررسی شد.`,
      { link: '/homework' },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.GRADE_CREATED)
  async onGradeCreated(event: GradeCreatedEvent) {
    await this.notificationsService.create(
      event.studentUserId,
      NotificationType.NEW_GRADE,
      `نمره‌ی جدید در «${event.className}»: ${event.title}`,
      { link: '/grades' },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.SCHEDULE_CHANGED)
  async onScheduleChanged(event: ScheduleChangedEvent) {
    // Recipients are students, who have no /classes/:id page (that's the
    // instructor's) — link home instead.
    await this.notificationsService.createMany(
      event.studentUserIds,
      NotificationType.SCHEDULE_CHANGE,
      `زمان‌بندی «${event.className}» تغییر کرد.`,
      { link: '/home' },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.MESSAGE_NEW)
  async onMessageNew(event: MessageNewEvent) {
    await this.notificationsService.create(
      event.recipientUserId,
      NotificationType.NEW_MESSAGE,
      `پیام جدید از ${event.senderName}`,
      { link: `/messages/${event.conversationId}` },
    );
  }
}

// Domain events emitted by producing modules (Join, Assignments, Grades,
// Messaging, Classes). NotificationsModule is the only listener — a
// producer never imports NotificationsService directly (CLAUDE.md
// Section 5.2: "reusable service, not tightly coupled to individual
// modules"). Event names are plain strings used with EventEmitter2.

export const NOTIFICATION_EVENTS = {
  INVITATION_ACCEPTED: 'invitation.accepted',
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_REVIEWED: 'assignment.reviewed',
  GRADE_CREATED: 'grade.created',
  SCHEDULE_CHANGED: 'schedule.changed',
  MESSAGE_NEW: 'message.new',
} as const;

export class InvitationAcceptedEvent {
  constructor(
    public readonly instructorUserId: string,
    public readonly studentName: string,
    public readonly className: string,
    public readonly classId: string,
  ) {}
}

export class AssignmentCreatedEvent {
  constructor(
    public readonly studentUserIds: string[],
    public readonly title: string,
    public readonly className: string,
    public readonly classId: string,
    public readonly assignmentId: string,
  ) {}
}

export class AssignmentReviewedEvent {
  constructor(
    public readonly studentUserId: string,
    public readonly title: string,
    public readonly classId: string,
    public readonly assignmentId: string,
  ) {}
}

export class GradeCreatedEvent {
  constructor(
    public readonly studentUserId: string,
    public readonly title: string,
    public readonly className: string,
    public readonly classId: string,
  ) {}
}

export class ScheduleChangedEvent {
  constructor(
    public readonly studentUserIds: string[],
    public readonly className: string,
    public readonly classId: string,
  ) {}
}

export class MessageNewEvent {
  constructor(
    public readonly recipientUserId: string,
    public readonly senderName: string,
    public readonly conversationId: string,
  ) {}
}

import type { LucideIcon } from "lucide-react";

/**
 * Single source of truth for every status value shown in the UI — class,
 * attendance, payment, homework, roster, enrollment, invitation link.
 * Each module (built now or later) reads its label + colour tone from here
 * instead of scattering its own string maps (CLAUDE.md §3.1 of the UI plan).
 */

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

/** Tailwind classes applied on top of a `<Badge variant="secondary">`. */
export const TONE_BADGE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-info text-info-foreground",
};

/** Foreground colour token for a tone, for numbers/labels outside a badge. */
export const TONE_TEXT_CLASS: Record<Tone, string> = {
  neutral: "text-foreground",
  accent: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
};

export interface StatusMeta {
  label: string;
  tone: Tone;
  icon?: LucideIcon;
}

// ---------------------------------------------------------------------------
// Class (backend enum ClassStatus)
// ---------------------------------------------------------------------------
export type ClassStatus =
  | "DRAFT"
  | "ACTIVE"
  | "FULL"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export const CLASS_STATUS_META: Record<ClassStatus, StatusMeta> = {
  DRAFT: { label: "پیش‌نویس", tone: "neutral" },
  ACTIVE: { label: "فعال", tone: "success" },
  FULL: { label: "تکمیل ظرفیت", tone: "warning" },
  COMPLETED: { label: "پایان‌یافته", tone: "info" },
  CANCELLED: { label: "لغوشده", tone: "danger" },
  ARCHIVED: { label: "بایگانی‌شده", tone: "neutral" },
};

// ---------------------------------------------------------------------------
// Attendance (module not built yet — CLAUDE.md §12 step 11)
// ---------------------------------------------------------------------------
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  PRESENT: { label: "حاضر", tone: "success" },
  ABSENT: { label: "غایب", tone: "danger" },
  LATE: { label: "تأخیر", tone: "warning" },
  EXCUSED: { label: "موجه", tone: "info" },
};

// ---------------------------------------------------------------------------
// Payment (module not built yet — CLAUDE.md §12 step 15)
// ---------------------------------------------------------------------------
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID" | "OVERDUE";

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  PAID: { label: "پرداخت‌شده", tone: "success" },
  PARTIALLY_PAID: { label: "پرداخت جزئی", tone: "warning" },
  UNPAID: { label: "پرداخت‌نشده", tone: "neutral" },
  OVERDUE: { label: "سررسید گذشته", tone: "danger" },
};

// ---------------------------------------------------------------------------
// Homework / submission (module not built yet — CLAUDE.md §12 step 12)
// ---------------------------------------------------------------------------
export type SubmissionStatus =
  | "ASSIGNED"
  | "SUBMITTED"
  | "REVIEWED"
  | "LATE"
  | "MISSING";

export const SUBMISSION_STATUS_META: Record<SubmissionStatus, StatusMeta> = {
  ASSIGNED: { label: "محول‌شده", tone: "neutral" },
  SUBMITTED: { label: "تحویل‌شده", tone: "info" },
  REVIEWED: { label: "بررسی‌شده", tone: "success" },
  LATE: { label: "با تأخیر", tone: "warning" },
  MISSING: { label: "تحویل‌نشده", tone: "danger" },
};

// ---------------------------------------------------------------------------
// Roster (backend enum RosterStatus) & Enrollment (EnrollmentStatus)
// ---------------------------------------------------------------------------
export type RosterStatus = "ACTIVE" | "ARCHIVED";

export const ROSTER_STATUS_META: Record<RosterStatus, StatusMeta> = {
  ACTIVE: { label: "فعال", tone: "success" },
  ARCHIVED: { label: "بایگانی‌شده", tone: "neutral" },
};

export type EnrollmentStatus = "ACTIVE" | "CANCELLED";

export const ENROLLMENT_STATUS_META: Record<EnrollmentStatus, StatusMeta> = {
  ACTIVE: { label: "فعال", tone: "success" },
  CANCELLED: { label: "لغوشده", tone: "danger" },
};

// ---------------------------------------------------------------------------
// Invitation link (backend enum InvitationLinkStatus)
// ---------------------------------------------------------------------------
export type InvitationLinkStatus = "ACTIVE" | "REVOKED";

export const INVITATION_LINK_STATUS_META: Record<InvitationLinkStatus, StatusMeta> = {
  ACTIVE: { label: "فعال", tone: "success" },
  REVOKED: { label: "غیرفعال", tone: "neutral" },
};

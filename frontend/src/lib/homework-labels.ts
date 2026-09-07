import type { HomeworkStatus } from "./assignments-api";

export const HOMEWORK_STATUS_LABELS: Record<HomeworkStatus, string> = {
  ASSIGNED: "تعیین‌شده",
  SUBMITTED: "ارسال‌شده",
  LATE: "ارسال با تأخیر",
  REVIEWED: "بررسی‌شده",
  MISSING: "ارسال نشده",
};

export const HOMEWORK_STATUS_VARIANT: Record<HomeworkStatus, "secondary" | "destructive" | "outline"> = {
  ASSIGNED: "outline",
  SUBMITTED: "secondary",
  LATE: "destructive",
  REVIEWED: "secondary",
  MISSING: "destructive",
};

import type { AttendanceStatus } from "./attendance-api";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "حاضر",
  ABSENT: "غایب",
  LATE: "تأخیر",
  EXCUSED: "موجه",
};

export const ATTENDANCE_ORDER: AttendanceStatus[] = ["PRESENT", "LATE", "EXCUSED", "ABSENT"];

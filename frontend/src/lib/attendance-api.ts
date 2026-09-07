import { apiFetch } from "./api";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface SessionAttendanceEntry {
  student: { id: string; name: string; email: string };
  status: AttendanceStatus | null;
}

export interface AttendanceSummary {
  overallRate: number | null;
  perStudent: {
    student: { id: string; name: string; email: string };
    markedCount: number;
    rate: number | null;
  }[];
}

export function fetchSessionAttendance(accessToken: string, classId: string, sessionId: string) {
  return apiFetch<SessionAttendanceEntry[]>(
    `/classes/${classId}/sessions/${sessionId}/attendance`,
    { accessToken },
  );
}

export function markAttendance(
  accessToken: string,
  classId: string,
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
) {
  return apiFetch<SessionAttendanceEntry[]>(
    `/classes/${classId}/sessions/${sessionId}/attendance/${studentId}`,
    { method: "PUT", accessToken, body: JSON.stringify({ status }) },
  );
}

export function fetchAttendanceSummary(accessToken: string, classId: string) {
  return apiFetch<AttendanceSummary>(`/classes/${classId}/attendance-summary`, { accessToken });
}

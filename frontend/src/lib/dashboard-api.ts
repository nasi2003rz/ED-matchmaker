import { apiFetch } from "./api";
import type { HomeworkItem } from "./assignments-api";
import type { MyGradeEntry } from "./grades-api";

export interface DashboardSession {
  id: string;
  startsAt: string;
  endsAt: string;
  class: { id: string; name: string };
}

export interface StudentDashboard {
  nextSession: DashboardSession | null;
  todaySessions: DashboardSession[];
  pendingHomework: HomeworkItem[];
  pendingHomeworkCount: number;
  recentGrades: MyGradeEntry[];
  unreadMessagesCount: number;
}

export function fetchStudentDashboard(accessToken: string) {
  return apiFetch<StudentDashboard>(`/dashboard/student`, { accessToken });
}

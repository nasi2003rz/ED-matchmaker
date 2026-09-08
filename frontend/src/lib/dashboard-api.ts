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

export interface ChildSummary {
  id: string;
  name: string;
  nextSession: DashboardSession | null;
  todaySessions: DashboardSession[];
  pendingHomeworkCount: number;
  recentGrades: MyGradeEntry[];
}

export interface ParentDashboard {
  children: ChildSummary[];
  unreadMessagesCount: number;
}

export function fetchParentDashboard(accessToken: string) {
  return apiFetch<ParentDashboard>(`/dashboard/parent`, { accessToken });
}

export interface FamilyCalendarSession extends DashboardSession {
  status: string;
  student: { id: string; name: string };
}

export function fetchFamilySchedule(accessToken: string, from: Date, to: Date) {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiFetch<FamilyCalendarSession[]>(`/schedule/family?${params}`, { accessToken });
}

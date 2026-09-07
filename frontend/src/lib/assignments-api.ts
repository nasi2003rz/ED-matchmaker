import { apiFetch } from "./api";

export type HomeworkStatus = "ASSIGNED" | "SUBMITTED" | "LATE" | "REVIEWED" | "MISSING";

export interface SubmissionInfo {
  content: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  reviewedAt: string | null;
}

export interface AssignmentListItem {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  createdAt: string;
  studentCount: number;
  submittedCount: number;
  reviewedCount: number;
}

export interface AssignmentStudentEntry {
  student: { id: string; name: string; email: string };
  status: HomeworkStatus;
  submission: SubmissionInfo | null;
}

export interface AssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  students: AssignmentStudentEntry[];
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  class: { id: string; name: string };
  status: HomeworkStatus;
  submission: SubmissionInfo | null;
}

// ---- Instructor side ----

export function fetchClassAssignments(accessToken: string, classId: string) {
  return apiFetch<AssignmentListItem[]>(`/classes/${classId}/assignments`, { accessToken });
}

export function createAssignment(
  accessToken: string,
  classId: string,
  input: { title: string; description?: string; dueAt?: string },
) {
  return apiFetch<AssignmentListItem>(`/classes/${classId}/assignments`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function fetchAssignmentDetail(accessToken: string, classId: string, assignmentId: string) {
  return apiFetch<AssignmentDetail>(`/classes/${classId}/assignments/${assignmentId}`, {
    accessToken,
  });
}

export function reviewSubmission(
  accessToken: string,
  classId: string,
  assignmentId: string,
  studentId: string,
  input: { score?: number; feedback?: string },
) {
  return apiFetch<AssignmentDetail>(
    `/classes/${classId}/assignments/${assignmentId}/submissions/${studentId}/review`,
    { method: "PUT", accessToken, body: JSON.stringify(input) },
  );
}

// ---- Student side ----

export function fetchMyHomework(accessToken: string) {
  return apiFetch<HomeworkItem[]>(`/homework/me`, { accessToken });
}

export function submitHomework(accessToken: string, assignmentId: string, content: string) {
  return apiFetch<HomeworkItem>(`/homework/${assignmentId}/submit`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify({ content }),
  });
}

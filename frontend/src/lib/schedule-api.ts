import { apiFetch } from "./api";

export type SessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface ScheduleSession {
  id: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  class: {
    id: string;
    name: string;
    classType: "GROUP" | "PRIVATE";
    location: { city: string } | null;
  };
}

export interface ClassSessionItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
}

export interface Proposal {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ProposalStatus;
  createdAt: string;
  respondedAt: string | null;
  student?: { id: string; name: string; email: string };
  class?: { id: string; name: string; instructorName: string; location: { city: string } | null };
}

export function fetchSchedule(accessToken: string, from: Date, to: Date) {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiFetch<ScheduleSession[]>(`/schedule?${params}`, { accessToken });
}

// Student's own calendar (Step 20 fix) — same shape as the instructor's
// `/schedule`, scoped server-side to the student's active enrollments.
export function fetchMySchedule(accessToken: string, from: Date, to: Date) {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiFetch<ScheduleSession[]>(`/schedule/mine?${params}`, { accessToken });
}

export function fetchClassSessions(accessToken: string, classId: string) {
  return apiFetch<ClassSessionItem[]>(`/classes/${classId}/sessions`, { accessToken });
}

export function createProposal(
  accessToken: string,
  classId: string,
  input: { studentId: string; startsAt: string; endsAt: string },
) {
  return apiFetch<Proposal>(`/classes/${classId}/proposals`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function fetchClassProposals(accessToken: string, classId: string) {
  return apiFetch<Proposal[]>(`/classes/${classId}/proposals`, { accessToken });
}

export function cancelProposal(accessToken: string, classId: string, proposalId: string) {
  return apiFetch<{ success: boolean }>(`/classes/${classId}/proposals/${proposalId}/cancel`, {
    method: "PATCH",
    accessToken,
  });
}

export function fetchMyProposals(accessToken: string) {
  return apiFetch<Proposal[]>(`/proposals/me`, { accessToken });
}

export function respondToProposal(
  accessToken: string,
  proposalId: string,
  action: "ACCEPT" | "REJECT",
) {
  return apiFetch<Proposal>(`/proposals/${proposalId}/respond`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify({ action }),
  });
}

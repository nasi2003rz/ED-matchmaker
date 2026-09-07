import { apiFetch } from "./api";

export type RosterStatus = "ACTIVE" | "ARCHIVED";

export interface RosterEntry {
  id: string;
  status: RosterStatus;
  note: string | null;
  addedAt: string;
  archivedAt: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
  };
}

export function fetchRoster(accessToken: string, status: RosterStatus = "ACTIVE") {
  return apiFetch<RosterEntry[]>(`/students?status=${status}`, { accessToken });
}

export function addStudentByEmail(accessToken: string, email: string) {
  return apiFetch<RosterEntry>("/students", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ email }),
  });
}

export function updateRosterEntry(
  accessToken: string,
  id: string,
  input: { note?: string; status?: RosterStatus },
) {
  return apiFetch<RosterEntry>(`/students/${id}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

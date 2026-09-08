import { apiFetch } from "./api";

export interface ChildEntry {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export function fetchChildren(accessToken: string) {
  return apiFetch<ChildEntry[]>(`/children`, { accessToken });
}

export function linkChild(accessToken: string, email: string) {
  return apiFetch<ChildEntry>(`/children`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ email }),
  });
}

export function unlinkChild(accessToken: string, studentId: string) {
  return apiFetch<{ success: boolean }>(`/children/${studentId}`, {
    method: "DELETE",
    accessToken,
  });
}

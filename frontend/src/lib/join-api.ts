import { apiFetch } from "./api";

export interface JoinPreview {
  id: string;
  name: string;
  description: string | null;
  status: string;
  instructorName: string;
  category: { id: string; name: string } | null;
  location: { id: string; city: string; province: string | null } | null;
  deliveryMode: string | null;
  days: string[];
  startTime: string | null;
  endTime: string | null;
  price: number | null;
  joinable: boolean;
}

export function fetchJoinPreview(classId: string) {
  return apiFetch<JoinPreview>(`/join/class/${classId}`);
}

export function acceptJoin(accessToken: string, classId: string) {
  return apiFetch<{ classId: string; joined: boolean }>(`/join/class/${classId}`, {
    method: "POST",
    accessToken,
  });
}

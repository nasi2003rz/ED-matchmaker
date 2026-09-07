import { apiFetch } from "./api";

export type GradeType = "NUMERIC" | "LETTER" | "PASS_FAIL" | "TEXT";

export interface GradeEntry {
  id: string;
  title: string;
  type: GradeType;
  value: string;
  note: string | null;
  createdAt: string;
}

export interface ClassGradesEntry {
  student: { id: string; name: string; email: string };
  grades: GradeEntry[];
}

export interface MyGradeEntry extends GradeEntry {
  class: { id: string; name: string };
}

// ---- Instructor side ----

export function fetchClassGrades(accessToken: string, classId: string) {
  return apiFetch<ClassGradesEntry[]>(`/classes/${classId}/grades`, { accessToken });
}

export function createGrade(
  accessToken: string,
  classId: string,
  input: { studentId: string; title: string; type: GradeType; value: string; note?: string },
) {
  return apiFetch<GradeEntry>(`/classes/${classId}/grades`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function deleteGrade(accessToken: string, classId: string, gradeId: string) {
  return apiFetch<{ success: boolean }>(`/classes/${classId}/grades/${gradeId}`, {
    method: "DELETE",
    accessToken,
  });
}

// ---- Student side ----

export function fetchMyGrades(accessToken: string) {
  return apiFetch<MyGradeEntry[]>(`/grades/me`, { accessToken });
}

import type { GradeType } from "./grades-api";

export const GRADE_TYPE_LABELS: Record<GradeType, string> = {
  NUMERIC: "عددی",
  LETTER: "حرفی",
  PASS_FAIL: "قبول/رد",
  TEXT: "بازخورد متنی",
};

export const GRADE_TYPE_PLACEHOLDER: Record<GradeType, string> = {
  NUMERIC: "مثلاً ۱۸.۵",
  LETTER: "مثلاً B+",
  PASS_FAIL: "PASS یا FAIL",
  TEXT: "بازخورد را بنویسید...",
};

export function formatGradeValue(type: GradeType, value: string): string {
  if (type === "PASS_FAIL") return value === "PASS" ? "قبول" : "رد";
  return value;
}

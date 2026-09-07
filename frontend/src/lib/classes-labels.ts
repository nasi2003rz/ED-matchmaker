import type { ClassType, DeliveryMode, Weekday } from "./classes-api";
import { CLASS_STATUS_META, type ClassStatus } from "./status";

/**
 * Class status labels now derive from the central registry in `./status`.
 * Prefer `<StatusBadge meta={CLASS_STATUS_META[status]} />` in new code;
 * this map stays for plain-text uses.
 */
export const STATUS_LABELS: Record<ClassStatus, string> = Object.fromEntries(
  (Object.keys(CLASS_STATUS_META) as ClassStatus[]).map((k) => [
    k,
    CLASS_STATUS_META[k].label,
  ]),
) as Record<ClassStatus, string>;

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  GROUP: "گروهی",
  PRIVATE: "خصوصی",
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  ONLINE: "آنلاین",
  OFFLINE: "حضوری",
  BOTH: "آنلاین و حضوری",
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  SAT: "شنبه",
  SUN: "یکشنبه",
  MON: "دوشنبه",
  TUE: "سه‌شنبه",
  WED: "چهارشنبه",
  THU: "پنجشنبه",
  FRI: "جمعه",
};

export const WEEKDAY_ORDER: Weekday[] = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];

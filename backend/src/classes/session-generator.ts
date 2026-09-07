import { Weekday } from '../generated/prisma/enums.js';

export interface RecurringPattern {
  days: Weekday[];
  startDate: Date | null;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  numberOfSessions: number | null;
}

const WEEKDAY_TO_JS_DAY: Record<Weekday, number> = {
  [Weekday.SUN]: 0,
  [Weekday.MON]: 1,
  [Weekday.TUE]: 2,
  [Weekday.WED]: 3,
  [Weekday.THU]: 4,
  [Weekday.FRI]: 5,
  [Weekday.SAT]: 6,
};

const DEFAULT_MAX_OCCURRENCES = 12;
const MAX_LOOKAHEAD_DAYS = 366;

/**
 * Projects a Class's recurring weekly pattern (days + start/end time) into
 * concrete dated occurrences, starting from `from` (or the pattern's own
 * startDate if later). Capped by numberOfSessions/endDate when given, or a
 * sane default (12 occurrences) so an open-ended class doesn't generate
 * sessions forever.
 */
export function generateSessionDates(
  pattern: RecurringPattern,
  from: Date = new Date(),
): { startsAt: Date; endsAt: Date }[] {
  if (pattern.days.length === 0 || !pattern.startTime || !pattern.endTime) {
    return [];
  }

  const [startH, startM] = pattern.startTime.split(':').map(Number);
  const [endH, endM] = pattern.endTime.split(':').map(Number);

  const rangeStart = pattern.startDate && pattern.startDate > from ? pattern.startDate : from;
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);

  const maxCount = pattern.numberOfSessions ?? DEFAULT_MAX_OCCURRENCES;
  const results: { startsAt: Date; endsAt: Date }[] = [];

  for (let i = 0; i < MAX_LOOKAHEAD_DAYS && results.length < maxCount; i++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + i);
    if (pattern.endDate && day > pattern.endDate) break;

    const isMatch = pattern.days.some((w) => WEEKDAY_TO_JS_DAY[w] === day.getDay());
    if (!isMatch) continue;

    const startsAt = new Date(day);
    startsAt.setHours(startH, startM, 0, 0);
    const endsAt = new Date(day);
    endsAt.setHours(endH, endM, 0, 0);
    results.push({ startsAt, endsAt });
  }

  return results;
}

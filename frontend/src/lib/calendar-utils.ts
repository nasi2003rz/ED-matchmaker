// The Persian week starts on Saturday. JS Date.getDay(): Sun=0..Sat=6.
function daysSinceSaturday(date: Date): number {
  return (date.getDay() + 1) % 7;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -daysSinceSaturday(date));
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/** 7-column week rows covering the full month (padded with adjacent days). */
export function getMonthGrid(date: Date): Date[][] {
  const firstDay = startOfMonth(date);
  const lastDay = endOfMonth(date);
  const gridStart = startOfWeek(firstDay);
  const gridEnd = addDays(startOfWeek(addDays(lastDay, -1)), 7);

  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor < gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(cursor, i));
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatShortDay(date: Date): string {
  return date.toLocaleDateString("fa-IR", { weekday: "short", day: "numeric" });
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("fa-IR", { year: "numeric", month: "long" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

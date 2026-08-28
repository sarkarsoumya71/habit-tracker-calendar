/**
 * All day math is done on *local* calendar days and keyed as "YYYY-MM-DD".
 * We never round-trip through UTC, because a habit done at 11pm must not
 * land on tomorrow for anyone east of Greenwich.
 */

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAYS_MIN = ["M", "T", "W", "T", "F", "S", "S"];

export function key(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return key(new Date());
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth() + n, 1);
  // Clamp the day so 31 Jan -1 month lands on 28/29 Feb, not 3 Mar.
  const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(d.getDate(), last));
  return out;
}

export function sameDay(a: Date, b: Date): boolean {
  return key(a) === key(b);
}

/** Monday-first index: Mon=0 … Sun=6. */
export function isoDow(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(d: Date): Date {
  return addDays(d, -isoDow(d));
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** The 6x7 grid a month view renders, always 42 cells so the grid never jumps. */
export function monthGrid(d: Date): Date[] {
  const start = startOfWeek(startOfMonth(d));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** Every day of a month, no padding — used by the year view's mini months. */
export function monthDays(year: number, month: number): Date[] {
  const n = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(year, month, i + 1));
}

export function weekDays(d: Date): Date[] {
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function daysBetween(a: string, b: string): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime();
  return Math.round(ms / 86400000);
}

export function formatLong(d: Date): string {
  return `${WEEKDAYS[isoDow(d)]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Label shown in the header for the current period. */
export function periodLabel(d: Date, view: string): string {
  if (view === "day") return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (view === "year") return String(d.getFullYear());
  if (view === "month") return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const s = startOfWeek(d);
  const e = endOfWeek(d);
  if (s.getMonth() === e.getMonth()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

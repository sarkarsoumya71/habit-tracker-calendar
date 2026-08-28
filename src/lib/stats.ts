import { addDays, daysBetween, fromKey, key, todayKey, isoDow } from "./date";
import type { Habit } from "./types";
import { ek } from "./store";

export type HabitStats = {
  total: number;
  currentStreak: number;
  longestStreak: number;
  last30: number;
  /** Completions per weekday, Mon-first. */
  byWeekday: number[];
  /** % of days completed since the first ever completion. */
  consistency: number;
  firstDay: string | null;
  lastDay: string | null;
};

export const EMPTY_STATS: HabitStats = {
  total: 0, currentStreak: 0, longestStreak: 0, last30: 0,
  byWeekday: [0, 0, 0, 0, 0, 0, 0], consistency: 0, firstDay: null, lastDay: null,
};

/** Sorted list of day keys a habit was completed on. */
export function daysFor(entries: Set<string>, habitId: string): string[] {
  const prefix = `${habitId}|`;
  const out: string[] = [];
  for (const k of entries) if (k.startsWith(prefix)) out.push(k.slice(prefix.length));
  return out.sort();
}

export function computeStats(entries: Set<string>, habitId: string): HabitStats {
  const days = daysFor(entries, habitId);
  if (!days.length) return EMPTY_STATS;

  const set = new Set(days);
  const today = todayKey();

  // Longest run of consecutive calendar days anywhere in the history.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // Current streak counts back from today, and stays alive on a day that is
  // still in progress: missing *today* only breaks it once today is over.
  let current = 0;
  let cursor = set.has(today) ? fromKey(today) : addDays(fromKey(today), -1);
  while (set.has(key(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const cutoff = key(addDays(fromKey(today), -29));
  const last30 = days.filter((d) => d >= cutoff && d <= today).length;

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const d of days) byWeekday[isoDow(fromKey(d))]++;

  const first = days[0];
  const span = Math.max(1, daysBetween(first, today) + 1);
  const consistency = Math.round((days.length / span) * 100);

  return {
    total: days.length,
    currentStreak: current,
    longestStreak: Math.max(longest, current),
    last30,
    byWeekday,
    consistency: Math.min(100, consistency),
    firstDay: first,
    lastDay: days[days.length - 1],
  };
}

/** Combined stats treating "any of these habits done" as a completed day. */
export function combinedStats(entries: Set<string>, habitIds: string[]): HabitStats {
  if (habitIds.length === 1) return computeStats(entries, habitIds[0]);
  const union = new Set<string>();
  for (const id of habitIds) for (const d of daysFor(entries, id)) union.add(ek("*", d));
  return computeStats(union, "*");
}

/** How many of the given habits were completed on a day. */
export function doneCount(entries: Set<string>, habits: Habit[], day: string): number {
  let n = 0;
  for (const h of habits) if (entries.has(ek(h.id, day))) n++;
  return n;
}

export function habitsDoneOn(entries: Set<string>, habits: Habit[], day: string): Habit[] {
  return habits.filter((h) => entries.has(ek(h.id, day)));
}

/** 0..1 fill used to shade year-view and month-view cells. */
export function density(entries: Set<string>, habits: Habit[], day: string): number {
  if (!habits.length) return 0;
  return doneCount(entries, habits, day) / habits.length;
}

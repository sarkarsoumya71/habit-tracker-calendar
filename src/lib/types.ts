export type Habit = {
  id: string;
  name: string;
  color: string;
  description: string;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
};

/** A completion. `day` is a local calendar day key: "YYYY-MM-DD". */
export type Entry = {
  habitId: string;
  day: string;
};

export type CalendarView = "day" | "week" | "month" | "year";

export type Snapshot = {
  habits: Habit[];
  entries: Entry[];
};

export type User = { id: string; email: string };

/** Palette offered in the habit editor. Tuned to read on near-black. */
export const PALETTE = [
  "#e5e7eb", // paper
  "#f87171", // red
  "#fb923c", // orange
  "#fbbf24", // amber
  "#a3e635", // lime
  "#34d399", // emerald
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#f472b6", // pink
  "#94a3b8", // slate
  "#c084fc", // purple
] as const;

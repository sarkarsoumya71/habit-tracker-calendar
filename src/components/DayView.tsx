"use client";

import { key, todayKey, formatLong } from "@/lib/date";
import { ek } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { Check, Pencil, Plus } from "./Icons";
import type { Habit } from "@/lib/types";

type Props = {
  cursor: Date;
  visible: Habit[];
  entries: Set<string>;
  onToggle: (habitId: string, day: string) => void;
  onEditHabit: (habit: Habit) => void;
  onNewHabit: () => void;
};

export default function DayView({ cursor, visible, entries, onToggle, onEditHabit, onNewHabit }: Props) {
  const k = key(cursor);
  const today = todayKey();
  const future = k > today;
  const done = visible.filter((h) => entries.has(ek(h.id, k))).length;

  return (
    <div className="day-wrap">
      <div className="day-head">
        <div>
          <div className="day-date">{formatLong(cursor)}</div>
          <div className="day-sub" style={{ marginTop: 6 }}>
            {k === today ? "Today" : future ? "Upcoming" : "Past"}
            {visible.length > 0 && ` · ${done} of ${visible.length} logged`}
          </div>
        </div>
        <button className="btn" onClick={onNewHabit}>
          <Plus /> New habit
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rail-empty" style={{ paddingTop: 20 }}>
          No habits to show here yet. Create one, or clear the filter in the sidebar.
        </div>
      ) : (
        <div className="day-list">
          {visible.map((h) => {
            const on = entries.has(ek(h.id, k));
            const st = computeStats(entries, h.id);
            return (
              <div
                key={h.id}
                className={`day-item ${on ? "on" : ""}`}
                style={{ ["--c" as string]: h.color }}
              >
                <button
                  onClick={() => !future && onToggle(h.id, k)}
                  disabled={future}
                  aria-pressed={on}
                  aria-label={`Mark ${h.name}`}
                  title={future ? "Not yet" : on ? "Logged — click to undo" : "Click to log"}
                  style={{ display: "flex" }}
                >
                  <span
                    className={`box ${on ? "on" : ""} ${future ? "future" : ""}`}
                    style={{ ["--c" as string]: h.color }}
                  >
                    <Check size={16} />
                  </span>
                </button>

                <div style={{ minWidth: 0 }}>
                  <div className="di-name">{h.name}</div>
                  {h.description && <div className="di-desc prose">{h.description}</div>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`streak ${st.currentStreak > 0 ? "hot" : ""}`}>
                    {st.currentStreak > 0 ? `${st.currentStreak}d streak` : `${st.total} total`}
                  </span>
                  <button
                    className="icon-btn edit-pencil"
                    onClick={() => onEditHabit(h)}
                    title="Edit habit"
                    aria-label={`Edit ${h.name}`}
                  >
                    <Pencil />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

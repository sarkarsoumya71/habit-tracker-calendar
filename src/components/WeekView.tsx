"use client";

import { weekDays, key, todayKey, WEEKDAYS_MIN } from "@/lib/date";
import { ek } from "@/lib/store";
import { Check } from "./Icons";
import type { Habit } from "@/lib/types";

type Props = {
  cursor: Date;
  visible: Habit[];
  entries: Set<string>;
  onToggle: (habitId: string, day: string) => void;
  onOpenDay: (day: string) => void;
  onEditHabit: (habit: Habit) => void;
};

/** The fast-logging surface: habits down the side, the week across the top. */
export default function WeekView({ cursor, visible, entries, onToggle, onOpenDay, onEditHabit }: Props) {
  const days = weekDays(cursor);
  const today = todayKey();

  return (
    <div className="matrix">
      <div className="matrix-head">
        <div className="label" style={{ display: "flex", alignItems: "center" }}>
          Habit
        </div>
        {days.map((d, i) => {
          const k = key(d);
          return (
            <div key={k}>
              <button
                className={`mh-day ${k === today ? "today" : ""}`}
                onDoubleClick={() => onOpenDay(k)}
                onClick={(e) => { if (e.detail >= 2) onOpenDay(k); }}
                title="Double-click to open this day"
                style={{ width: "100%" }}
              >
                <span className="mh-dow">{WEEKDAYS_MIN[i]}</span>
                <span className="mh-num num">{d.getDate()}</span>
              </button>
            </div>
          );
        })}
      </div>

      {visible.map((h) => (
        <div className="matrix-row" key={h.id}>
          <button className="mr-name" onClick={() => onEditHabit(h)} title="Edit habit">
            <i className="swatch" style={{ background: h.color, color: h.color }} />
            <span className="habit-name">{h.name}</span>
          </button>

          {days.map((d) => {
            const k = key(d);
            const on = entries.has(ek(h.id, k));
            const future = k > today;
            return (
              <button
                key={k}
                className="mcheck"
                disabled={future}
                onClick={() => onToggle(h.id, k)}
                aria-pressed={on}
                aria-label={`${h.name} on ${k}`}
                title={future ? "Not yet" : on ? "Logged — click to undo" : "Click to log"}
              >
                <span
                  className={`box ${on ? "on" : ""} ${future ? "future" : ""}`}
                  style={{ ["--c" as string]: h.color }}
                >
                  <Check />
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

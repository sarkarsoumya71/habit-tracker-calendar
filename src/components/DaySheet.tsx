"use client";

import { useEffect } from "react";
import { fromKey, formatLong, todayKey } from "@/lib/date";
import { ek } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { Check, Close, Pencil, Plus } from "./Icons";
import type { Habit } from "@/lib/types";

type Props = {
  day: string;
  habits: Habit[];
  entries: Set<string>;
  onClose: () => void;
  onToggle: (habitId: string, day: string) => void;
  onNewHabit: () => void;
  onEditHabit: (habit: Habit) => void;
};

/**
 * What a double-click on a calendar day opens: log the day, add a habit,
 * or jump into a habit's colour and description.
 */
export default function DaySheet({
  day, habits, entries, onClose, onToggle, onNewHabit, onEditHabit,
}: Props) {
  const date = fromKey(day);
  const today = todayKey();
  const future = day > today;
  const done = habits.filter((h) => entries.has(ek(h.id, day))).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={formatLong(date)}>
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <div className="modal-title" style={{ textTransform: "none", letterSpacing: "-0.01em", fontSize: 14, color: "var(--text)" }}>
              {formatLong(date)}
            </div>
            <div className="label" style={{ marginTop: 3 }}>
              {day === today ? "Today" : future ? "Upcoming" : "Past"}
              {habits.length > 0 && ` · ${done}/${habits.length} logged`}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </div>

        <div className="modal-body">
          {habits.length === 0 ? (
            <p className="hint" style={{ fontSize: 12.5 }}>
              Nothing to track yet. Create your first habit — give it a name, a colour,
              and a description if it helps.
            </p>
          ) : (
            <div className="sheet-list">
              {habits.map((h) => {
                const on = entries.has(ek(h.id, day));
                const st = computeStats(entries, h.id);
                return (
                  <div
                    key={h.id}
                    className={`sheet-item ${on ? "on" : ""}`}
                    style={{ ["--c" as string]: h.color }}
                  >
                    <button
                      onClick={() => !future && onToggle(h.id, day)}
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
                        <Check />
                      </span>
                    </button>

                    <div style={{ minWidth: 0 }}>
                      <div className="habit-name" style={{ color: on ? "var(--text)" : undefined }}>
                        {h.name}
                      </div>
                      {h.description && <div className="di-desc prose">{h.description}</div>}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`streak ${st.currentStreak > 0 ? "hot" : ""}`}>
                        {st.currentStreak > 0 ? `${st.currentStreak}d` : ""}
                      </span>
                      <button
                        className="icon-btn edit-pencil"
                        onClick={() => onEditHabit(h)}
                        title="Edit colour & description"
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

        <div className="modal-foot">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Done</button>
          <button className="btn btn-primary" onClick={onNewHabit}>
            <Plus /> New habit
          </button>
        </div>
      </div>
    </div>
  );
}

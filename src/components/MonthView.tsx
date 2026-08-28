"use client";

import { monthGrid, key, todayKey, WEEKDAYS, MONTHS_SHORT } from "@/lib/date";
import { ek } from "@/lib/store";
import type { Habit } from "@/lib/types";

type Props = {
  cursor: Date;
  visible: Habit[];
  entries: Set<string>;
  filtering: boolean;
  onOpenDay: (day: string) => void;
};

const MAX_CHIPS = 3;

export default function MonthView({ cursor, visible, entries, filtering, onOpenDay }: Props) {
  const cells = monthGrid(cursor);
  const today = todayKey();
  const month = cursor.getMonth();

  return (
    <>
      <div className="dow-head">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((date) => {
          const k = key(date);
          const done = visible.filter((h) => entries.has(ek(h.id, k)));
          const outside = date.getMonth() !== month;
          // With a filter on, days that miss every selected habit recede.
          const muted = filtering && done.length === 0;
          const shown = done.slice(0, MAX_CHIPS);
          const extra = done.length - shown.length;

          return (
            <div
              key={k}
              className={[
                "mcell",
                outside ? "out" : "",
                k === today ? "today" : "",
                muted ? "muted" : "",
              ].filter(Boolean).join(" ")}
              onDoubleClick={() => onOpenDay(k)}
              onClick={(e) => {
                // Treat a second tap on touch as the double-click.
                if (e.detail >= 2) onOpenDay(k);
              }}
              role="button"
              tabIndex={0}
              aria-label={`${MONTHS_SHORT[date.getMonth()]} ${date.getDate()} — ${done.length} logged`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenDay(k);
                }
              }}
            >
              <div className="mcell-top">
                <span className="mcell-num">
                  {date.getDate() === 1 ? `${MONTHS_SHORT[date.getMonth()]} 1` : date.getDate()}
                </span>
                {done.length > 0 && (
                  <span className="mcell-count num">
                    {done.length}
                    {!filtering && visible.length > 0 ? `/${visible.length}` : ""}
                  </span>
                )}
              </div>

              <div className="chips">
                {shown.map((h) => (
                  <span
                    key={h.id}
                    className="chip"
                    style={{ ["--chip" as string]: h.color, color: h.color }}
                    title={h.name}
                  >
                    <i className="chip-dot" />
                    <span className="chip-text">{h.name}</span>
                  </span>
                ))}
                {extra > 0 && <span className="chip-more num">+{extra}</span>}
              </div>

              {done.length > 0 && visible.length > 0 && (
                <i
                  className="fill"
                  style={{ transform: `scaleX(${done.length / visible.length})` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

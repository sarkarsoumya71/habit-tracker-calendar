"use client";

import { monthDays, key, todayKey, isoDow, MONTHS_SHORT, WEEKDAYS_MIN } from "@/lib/date";
import { ek } from "@/lib/store";
import type { Habit } from "@/lib/types";

type Props = {
  cursor: Date;
  visible: Habit[];
  entries: Set<string>;
  onOpenDay: (day: string) => void;
};

/**
 * Twelve mini months shaded by how much of the visible habit set was logged.
 * With one habit selected the whole year becomes that habit's heatmap, which
 * is the fastest way to see how often it actually happens.
 */
export default function YearView({ cursor, visible, entries, onOpenDay }: Props) {
  const year = cursor.getFullYear();
  const today = todayKey();
  const solo = visible.length === 1 ? visible[0].color : null;

  return (
    <div className="year-wrap">
      {Array.from({ length: 12 }, (_, m) => {
        const days = monthDays(year, m);
        const pad = isoDow(days[0]);
        let logged = 0;

        const cells = days.map((d) => {
          const k = key(d);
          const done = visible.filter((h) => entries.has(ek(h.id, k))).length;
          if (done > 0) logged++;
          const ratio = visible.length ? done / visible.length : 0;
          // Five discrete steps read better than a continuous ramp.
          const alpha = ratio === 0 ? 0 : 0.28 + Math.ceil(ratio * 4) * 0.18;
          const base = solo ?? "#e9ecef";
          return (
            <button
              key={k}
              className={`ycell ${k === today ? "today" : ""} ${k > today ? "future" : ""}`}
              style={done > 0 ? { background: base, opacity: Math.min(1, alpha) } : undefined}
              onDoubleClick={() => onOpenDay(k)}
              onClick={(e) => { if (e.detail >= 2) onOpenDay(k); }}
              title={`${MONTHS_SHORT[m]} ${d.getDate()} — ${done} logged`}
              aria-label={`${MONTHS_SHORT[m]} ${d.getDate()}, ${done} logged`}
            />
          );
        });

        return (
          <div className="mini" key={m}>
            <div className="mini-head">
              <span className="mini-name">{MONTHS_SHORT[m]}</span>
              <span className="mini-count num">{logged}d</span>
            </div>
            <div className="mini-dow">
              {WEEKDAYS_MIN.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="mini-grid">
              {Array.from({ length: pad }, (_, i) => (
                <span className="ycell pad" key={`p${i}`} />
              ))}
              {cells}
            </div>
          </div>
        );
      })}
    </div>
  );
}

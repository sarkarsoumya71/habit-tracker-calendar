"use client";

import { combinedStats } from "@/lib/stats";
import { ek } from "@/lib/store";
import { WEEKDAYS_MIN, fromKey, formatLong } from "@/lib/date";
import { Close } from "./Icons";
import type { Habit } from "@/lib/types";

type Props = {
  visible: Habit[];
  entries: Set<string>;
  filtering: boolean;
  periodLabel: string;
  periodDays: string[];
  onClose: () => void;
};

export default function Rail({ visible, entries, filtering, periodLabel, periodDays, onClose }: Props) {
  const solo = visible.length === 1 ? visible[0] : null;
  const accent = solo?.color ?? "#949ba2";
  const stats = combinedStats(entries, visible.map((h) => h.id));

  // Completions inside the period currently on screen.
  const inPeriod = periodDays.reduce(
    (n, d) => n + (visible.some((h) => entries.has(ek(h.id, d))) ? 1 : 0),
    0
  );

  // Last 30 days, oldest first, for the sparkline.
  const spark: boolean[] = [];
  const cursor = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    spark.push(visible.some((h) => entries.has(ek(h.id, k))));
  }

  const peak = Math.max(1, ...stats.byWeekday);
  const bestDay = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));

  return (
    <aside className="rail" aria-label="Insights">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div className="rail-title">
          {solo && <i className="swatch" style={{ background: solo.color, color: solo.color }} />}
          <h2>{solo ? solo.name : filtering ? `${visible.length} habits` : "All habits"}</h2>
        </div>
        <button className="icon-btn mobile-only" onClick={onClose} aria-label="Close insights">
          <Close />
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="rail-empty">
          Add a habit to start seeing streaks, weekday patterns and how consistent you have been.
        </p>
      ) : (
        <>
          {solo?.description && <div className="rail-desc">{solo.description}</div>}

          <div className="stat-grid">
            <div className="stat">
              <div className="stat-v num" style={{ color: stats.currentStreak > 0 ? accent : undefined }}>
                {stats.currentStreak}
              </div>
              <div className="stat-l">Current streak</div>
            </div>
            <div className="stat">
              <div className="stat-v num">{stats.longestStreak}</div>
              <div className="stat-l">Longest streak</div>
            </div>
            <div className="stat">
              <div className="stat-v num">{stats.total}</div>
              <div className="stat-l">Days logged</div>
            </div>
            <div className="stat">
              <div className="stat-v num">{stats.consistency}%</div>
              <div className="stat-l">Consistency</div>
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              Last 30 days · {stats.last30}
            </div>
            <div className="spark" style={{ ["--c" as string]: accent }}>
              {spark.map((on, i) => (
                <i key={i} className={on ? "on" : ""} style={{ height: on ? "100%" : "34%" }} />
              ))}
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              By weekday{stats.total > 0 ? ` · best ${WEEKDAYS_MIN[bestDay]}` : ""}
            </div>
            <div className="bars" style={{ ["--c" as string]: accent }}>
              {stats.byWeekday.map((v, i) => (
                <div className="bar-col" key={i}>
                  <span className="bar-v">{v}</span>
                  <span className="bar" style={{ height: `${(v / peak) * 100}%`, opacity: v ? 0.85 : 0.2 }} />
                  <span className="bar-l">{WEEKDAYS_MIN[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              {periodLabel}
            </div>
            <div className="stat">
              <div className="stat-v num">
                {inPeriod}
                <span style={{ fontSize: 13, color: "var(--text-4)" }}> / {periodDays.length}</span>
              </div>
              <div className="stat-l">Days on screen with activity</div>
            </div>
          </div>

          {stats.firstDay && (
            <p className="hint">
              First logged {formatLong(fromKey(stats.firstDay))}.
              {stats.lastDay && stats.lastDay !== stats.firstDay && (
                <> Most recent {formatLong(fromKey(stats.lastDay))}.</>
              )}
            </p>
          )}
        </>
      )}
    </aside>
  );
}

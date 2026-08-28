"use client";

import { computeStats } from "@/lib/stats";
import { Plus, Pencil, Download, Upload, Logout, Cloud } from "./Icons";
import type { Habit, User } from "@/lib/types";

type Props = {
  habits: Habit[];
  entries: Set<string>;
  selected: Set<string>;
  matchingDays: number;
  open: boolean;
  /** Collapsed to a strip of colour swatches. */
  rail: boolean;
  user: User | null;
  cloudEnabled: boolean;
  onToggleSelect: (id: string, additive: boolean) => void;
  onClearFilter: () => void;
  onNewHabit: () => void;
  onEditHabit: (habit: Habit) => void;
  onExport: () => void;
  onImport: () => void;
  onLogout: () => void;
  onSignIn: () => void;
  /** The resize handle, owned by the page so it can drive the width. */
  children?: React.ReactNode;
};

export default function Sidebar({
  habits, entries, selected, matchingDays, open, rail, user, cloudEnabled,
  onToggleSelect, onClearFilter, onNewHabit, onEditHabit,
  onExport, onImport, onLogout, onSignIn, children,
}: Props) {
  const filtering = selected.size > 0;

  return (
    <aside className={`sidebar ${open ? "open" : ""} ${rail ? "rail" : ""}`} aria-label="Habits">
      <div className="side-head">
        <span className="label">Habits · {habits.length}</span>
        <button className="icon-btn" onClick={onNewHabit} title="New habit (N)" aria-label="New habit">
          <Plus />
        </button>
      </div>

      <div className="side-scroll">
        {habits.length === 0 ? (
          <p className="hint rail-hide" style={{ padding: "10px 8px 0" }}>
            No habits yet. Double-click any day on the calendar, or press{" "}
            <kbd>N</kbd>, to add your first one.
          </p>
        ) : (
          habits.map((h) => {
            const st = computeStats(entries, h.id);
            const on = selected.has(h.id);
            return (
              <div key={h.id} style={{ position: "relative" }}>
                <button
                  className={`habit-row ${on ? "on" : ""} ${filtering && !on ? "dim" : ""}`}
                  // Cmd/Ctrl-click stacks habits into the filter instead of replacing it.
                  onClick={(e) => onToggleSelect(h.id, e.metaKey || e.ctrlKey || e.shiftKey)}
                  aria-pressed={on}
                  title={
                    h.description
                      ? `${h.name} — ${h.description}`
                      : `${h.name} — click to filter the calendar`
                  }
                  aria-label={h.name}
                >
                  <i className="swatch" style={{ background: h.color, color: h.color }} />
                  <span className="habit-name">{h.name}</span>
                  <span
                    className={`streak ${st.currentStreak > 0 ? "hot" : ""}`}
                    title={
                      st.currentStreak > 0
                        ? `${st.currentStreak} day streak · ${st.total} logged in total`
                        : `${st.total} logged in total`
                    }
                  >
                    {st.currentStreak > 0 ? `${st.currentStreak}d` : st.total > 0 ? `${st.total}×` : "–"}
                  </span>
                </button>
                <button
                  className="icon-btn edit-pencil"
                  style={{ position: "absolute", right: 30, top: 5, width: 24, height: 24 }}
                  onClick={() => onEditHabit(h)}
                  title="Edit habit"
                  aria-label={`Edit ${h.name}`}
                >
                  <Pencil />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="side-foot">
        {filtering ? (
          <div className="filter-note">
            <span className="num">
              {matchingDays} day{matchingDays === 1 ? "" : "s"} matched
            </span>
            <button className="link-btn" onClick={onClearFilter}>
              Clear
            </button>
          </div>
        ) : (
          <div className="filter-note">
            <span>Click a habit to filter</span>
          </div>
        )}
        <button
          className="btn"
          onClick={onNewHabit}
          style={{ width: "100%" }}
          title={rail ? "New habit (N)" : undefined}
          aria-label="New habit"
        >
          <Plus />
          {!rail && <span>New habit</span>}
        </button>

        <div className="account">
          <span className="account-who" title={user ? user.email : "Saved in this browser only"}>
            {user ? user.email : "This device only"}
          </span>
          <button className="icon-btn" onClick={onExport} title="Export a JSON backup" aria-label="Export backup">
            <Download />
          </button>
          <button className="icon-btn" onClick={onImport} title="Import a backup" aria-label="Import backup">
            <Upload />
          </button>
          {user ? (
            <button className="icon-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">
              <Logout />
            </button>
          ) : cloudEnabled ? (
            <button className="icon-btn" onClick={onSignIn} title="Sign in to sync across devices" aria-label="Sign in">
              <Cloud />
            </button>
          ) : null}
        </div>
      </div>

      {children}
    </aside>
  );
}

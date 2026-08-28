"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  addDays, addMonths, key, todayKey, fromKey, periodLabel,
  weekDays, monthDays, startOfMonth, endOfMonth,
} from "@/lib/date";
import type { CalendarView, Habit, Snapshot } from "@/lib/types";

import Sidebar from "@/components/Sidebar";
import Rail from "@/components/Rail";
import MonthView from "@/components/MonthView";
import WeekView from "@/components/WeekView";
import DayView from "@/components/DayView";
import YearView from "@/components/YearView";
import HabitModal from "@/components/HabitModal";
import DaySheet from "@/components/DaySheet";
import Auth from "@/components/Auth";
import { Logo, ChevronLeft, ChevronRight, Plus, Menu, Chart } from "@/components/Icons";

const VIEWS: CalendarView[] = ["day", "week", "month", "year"];
const VIEW_KEYS: Record<string, CalendarView> = { d: "day", w: "week", m: "month", y: "year" };
const SKIP_KEY = "htc.skipAuth";
const VIEW_KEY = "htc.view";
const WIDTH_KEY = "htc.sidebarW";

// Sidebar sizing. Dragging below SNAP collapses to RAIL_W, a strip of swatches.
const RAIL_W = 62;
const MIN_W = 176;
const MAX_W = 420;
const SNAP_W = 140;
const DEFAULT_W = 258;

export default function Page() {
  const store = useStore();
  const {
    ready, cloudEnabled, user, habits, entries, offline, queued,
    addHabit, updateHabit, deleteHabit, toggleEntry, logout,
    exportSnapshot, importSnapshot,
  } = store;

  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetDay, setSheetDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ habit: Habit | null } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarW, setSidebarW] = useState(DEFAULT_W);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const say = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 2600);
  }, []);

  // Restore the last view, and honour ?view= from the PWA shortcuts.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("view");
    const stored = window.localStorage.getItem(VIEW_KEY);
    const next = (param ?? stored ?? "") as CalendarView;
    if (VIEWS.includes(next)) setView(next);
    setSkipped(window.localStorage.getItem(SKIP_KEY) === "1");
    const w = Number(window.localStorage.getItem(WIDTH_KEY));
    if (Number.isFinite(w) && w > 0) setSidebarW(w === RAIL_W ? RAIL_W : Math.min(MAX_W, Math.max(MIN_W, w)));
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const live = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const filtering = selected.size > 0;
  const visible = useMemo(
    () => (filtering ? live.filter((h) => selected.has(h.id)) : live),
    [live, selected, filtering]
  );

  /** Every day in the period on screen, for the insights panel. */
  const periodDays = useMemo(() => {
    if (view === "day") return [key(cursor)];
    if (view === "week") return weekDays(cursor).map(key);
    if (view === "month") {
      const days: string[] = [];
      for (let d = startOfMonth(cursor); d <= endOfMonth(cursor); d = addDays(d, 1)) days.push(key(d));
      return days;
    }
    return Array.from({ length: 12 }, (_, m) => monthDays(cursor.getFullYear(), m).map(key)).flat();
  }, [view, cursor]);

  /** Days anywhere in history matching the active filter. */
  const matchingDays = useMemo(() => {
    if (!filtering) return 0;
    const days = new Set<string>();
    for (const k of entries) {
      const i = k.lastIndexOf("|");
      if (selected.has(k.slice(0, i))) days.add(k.slice(i + 1));
    }
    return days.size;
  }, [entries, selected, filtering]);

  const step = useCallback((dir: 1 | -1) => {
    setCursor((c) => {
      if (view === "day") return addDays(c, dir);
      if (view === "week") return addDays(c, 7 * dir);
      if (view === "month") return addMonths(c, dir);
      return new Date(c.getFullYear() + dir, c.getMonth(), 1);
    });
  }, [view]);

  const openDay = useCallback((day: string) => {
    setCursor(fromKey(day));
    setSheetDay(day);
  }, []);

  const toggleSelect = useCallback((id: string, additive: boolean) => {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (additive) {
        if (prev.has(id)) next.delete(id);
        else next.add(id);
      } else if (!(prev.size === 1 && prev.has(id))) {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts, skipped while a field has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (VIEW_KEYS[k]) { e.preventDefault(); setView(VIEW_KEYS[k]); return; }
      if (k === "t") { e.preventDefault(); setCursor(new Date()); return; }
      if (k === "n") { e.preventDefault(); setEditing({ habit: null }); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); return; }
      if (e.key === "Escape") { setSelected(new Set()); setDrawer(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const commitWidth = useCallback((w: number) => {
    setSidebarW(w);
    try { window.localStorage.setItem(WIDTH_KEY, String(w)); } catch { /* ignore */ }
  }, []);

  /** Drag the sidebar's right edge; past SNAP_W it collapses to the swatch rail. */
  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarW;
    let latest = startW;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const raw = startW + (ev.clientX - startX);
      latest = raw < SNAP_W ? RAIL_W : Math.min(MAX_W, Math.max(MIN_W, raw));
      setSidebarW(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      setDragging(false);
      commitWidth(latest);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarW, commitWidth]);

  const toggleRail = useCallback(() => {
    commitWidth(sidebarW <= RAIL_W + 8 ? DEFAULT_W : RAIL_W);
  }, [sidebarW, commitWidth]);

  const signIn = useCallback(() => {
    try { window.localStorage.removeItem(SKIP_KEY); } catch { /* ignore */ }
    setSkipped(false);
  }, []);

  const onExport = useCallback(() => {
    const snap = exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habits-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    say(`Exported ${snap.habits.length} habits and ${snap.entries.length} days.`);
  }, [exportSnapshot, say]);

  const onImportFile = useCallback(async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Snapshot;
      if (!parsed || !Array.isArray(parsed.habits)) throw new Error("bad shape");
      say(await importSnapshot(parsed));
    } catch {
      say("That file is not a habit export.");
    }
  }, [importSnapshot, say]);

  // ---- gates -------------------------------------------------------------

  if (!ready) {
    return (
      <div className="auth">
        <div className="auth-brand" style={{ opacity: 0.6 }}>
          <Logo size={34} />
          <div>
            <h1>Habit Tracker</h1>
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !skipped) {
    return (
      <Auth
        onSkip={() => {
          try { window.localStorage.setItem(SKIP_KEY, "1"); } catch { /* ignore */ }
          setSkipped(true);
        }}
      />
    );
  }

  // ---- app ---------------------------------------------------------------

  const label = periodLabel(cursor, view);

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="icon-btn mobile-only"
          onClick={() => setDrawer((v) => !v)}
          aria-label="Habits"
        >
          <Menu />
        </button>

        <div className="brand">
          <Logo size={22} className="brand-mark" />
          <div className="brand-name">
            Habit<span>Tracker</span>
          </div>
        </div>

        <div className="navgroup">
          <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous" title="Previous (←)">
            <ChevronLeft />
          </button>
          <button className="icon-btn" onClick={() => step(1)} aria-label="Next" title="Next (→)">
            <ChevronRight />
          </button>
          <button className="btn desktop-only" onClick={() => setCursor(new Date())} title="Jump to today (T)">
            Today
          </button>
        </div>

        <div className="period">{label}</div>

        <div className="spacer" />

        <div className="seg" role="group" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              title={`${v} view (${v[0].toUpperCase()})`}
            >
              {v}
              <span className="kbd desktop-only">{v[0].toUpperCase()}</span>
            </button>
          ))}
        </div>

        <button
          className="icon-btn"
          onClick={() => setRailOpen((v) => !v)}
          aria-label="Insights"
          title="Insights"
        >
          <Chart />
        </button>

        <button
          className="btn btn-primary"
          onClick={() => setEditing({ habit: null })}
          title="New habit (N)"
          aria-label="New habit"
        >
          <Plus />
          <span className="desktop-only">Habit</span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = "";
          }}
        />
      </header>

      <div
        className={`body ${railOpen ? "rail-open" : ""}`}
        style={{ ["--sidebar-w" as string]: `${sidebarW}px` }}
      >
        {drawer && <div className="drawer-scrim" onClick={() => setDrawer(false)} />}

        <Sidebar
          habits={live}
          entries={entries}
          selected={selected}
          matchingDays={matchingDays}
          open={drawer}
          user={user}
          cloudEnabled={cloudEnabled}
          onToggleSelect={(id, additive) => { toggleSelect(id, additive); setDrawer(false); }}
          onClearFilter={() => setSelected(new Set())}
          onNewHabit={() => { setEditing({ habit: null }); setDrawer(false); }}
          onEditHabit={(h) => { setEditing({ habit: h }); setDrawer(false); }}
          onExport={onExport}
          onImport={() => fileRef.current?.click()}
          onLogout={() => void logout()}
          onSignIn={signIn}
          rail={sidebarW <= RAIL_W + 8}
        >
          <div
            className={`resize-handle ${dragging ? "dragging" : ""}`}
            onPointerDown={startResize}
            onDoubleClick={toggleRail}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the habit sidebar"
            title="Drag to resize · double-click to collapse"
          />
        </Sidebar>

        <main className="main">
          <div className="canvas">
            {live.length === 0 ? (
              <div className="empty">
                <Logo size={44} />
                <h3>Nothing tracked yet</h3>
                <p>
                  Add a habit, then mark the days you do it. Double-click any day on the
                  calendar to log it or create something new.
                </p>
                <button className="btn btn-primary" onClick={() => setEditing({ habit: null })}>
                  <Plus /> Create your first habit
                </button>
                <span className="kbd-hint">
                  <kbd>D</kbd> <kbd>W</kbd> <kbd>M</kbd> <kbd>Y</kbd> switch views · <kbd>T</kbd> today · <kbd>N</kbd> new
                </span>
              </div>
            ) : view === "month" ? (
              <MonthView
                cursor={cursor}
                visible={visible}
                entries={entries}
                filtering={filtering}
                onOpenDay={openDay}
              />
            ) : view === "week" ? (
              <WeekView
                cursor={cursor}
                visible={visible}
                entries={entries}
                onToggle={toggleEntry}
                onOpenDay={openDay}
                onEditHabit={(h) => setEditing({ habit: h })}
              />
            ) : view === "day" ? (
              <DayView
                cursor={cursor}
                visible={visible}
                entries={entries}
                onToggle={toggleEntry}
                onEditHabit={(h) => setEditing({ habit: h })}
                onNewHabit={() => setEditing({ habit: null })}
              />
            ) : (
              <YearView cursor={cursor} visible={visible} entries={entries} onOpenDay={openDay} />
            )}
          </div>
        </main>

        <Rail
          visible={visible}
          entries={entries}
          filtering={filtering}
          periodLabel={label}
          periodDays={periodDays}
          onClose={() => setRailOpen(false)}
        />
      </div>

      {sheetDay && (
        <DaySheet
          day={sheetDay}
          habits={visible}
          entries={entries}
          onClose={() => setSheetDay(null)}
          onToggle={toggleEntry}
          onNewHabit={() => setEditing({ habit: null })}
          onEditHabit={(h) => setEditing({ habit: h })}
        />
      )}

      {editing && (
        <HabitModal
          habit={editing.habit}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (editing.habit) {
              updateHabit(editing.habit.id, values);
              say(`Saved “${values.name}”.`);
            } else {
              const created = await addHabit(values);
              // A brand-new habit is almost always meant to be logged today.
              if (created && sheetDay && sheetDay <= todayKey()) {
                toggleEntry(created.id, sheetDay);
              }
              say(`Added “${values.name}”.`);
            }
            setEditing(null);
          }}
          onDelete={
            editing.habit
              ? () => {
                  const name = editing.habit!.name;
                  deleteHabit(editing.habit!.id);
                  setSelected((prev) => {
                    const next = new Set(prev);
                    next.delete(editing.habit!.id);
                    return next;
                  });
                  setEditing(null);
                  say(`Deleted “${name}”.`);
                }
              : undefined
          }
        />
      )}

      {(offline || queued > 0) && (
        <div className="toast" style={{ bottom: 62 }}>
          <span className="dot-off" style={{ display: "inline-block", marginRight: 6 }} />
          {queued > 0 ? `${queued} change${queued === 1 ? "" : "s"} waiting to sync` : "Offline — changes are saved locally"}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

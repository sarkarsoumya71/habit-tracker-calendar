"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { Habit, Entry, User, Snapshot } from "./types";

const CACHE_KEY = "htc.cache.v1";
const QUEUE_KEY = "htc.queue.v1";

/** A completion is identified by this composite key everywhere in the client. */
export const ek = (habitId: string, day: string) => `${habitId}|${day}`;

type Op =
  | { kind: "habit.add"; habit: Habit }
  | { kind: "habit.update"; id: string; patch: Partial<Habit> }
  | { kind: "habit.delete"; id: string }
  | { kind: "entry.set"; habitId: string; day: string; done: boolean };

type Store = {
  ready: boolean;
  cloudEnabled: boolean;
  user: User | null;
  habits: Habit[];
  entries: Set<string>;
  offline: boolean;
  queued: number;
  addHabit: (input: { name: string; color: string; description: string }) => Promise<Habit | null>;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  setEntry: (habitId: string, day: string, done: boolean) => void;
  toggleEntry: (habitId: string, day: string) => void;
  login: (email: string, password: string, mode: "login" | "register") => Promise<string | null>;
  logout: () => Promise<void>;
  exportSnapshot: () => Snapshot;
  importSnapshot: (snap: Snapshot) => Promise<string>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

const uid = () => `h_local_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function splitKey(k: string): Entry {
  const i = k.lastIndexOf("|");
  return { habitId: k.slice(0, i), day: k.slice(i + 1) };
}

function readCache(): Snapshot {
  if (typeof window === "undefined") return { habits: [], entries: [] };
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return { habits: [], entries: [] };
    const parsed = JSON.parse(raw) as Snapshot;
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { habits: [], entries: [] };
  }
}

function writeCache(snap: Snapshot) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
  } catch {
    // Private-mode or quota failures must not break the session in progress.
  }
}

function readQueue(): Op[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Op[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(ops: Op[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  } catch {
    // ignore
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Set<string>>(new Set());
  const [offline, setOffline] = useState(false);
  const [queued, setQueued] = useState(0);

  // Mirrors of the latest state, so callbacks never close over stale values.
  const habitsRef = useRef<Habit[]>([]);
  const entriesRef = useRef<Set<string>>(new Set());
  const userRef = useRef<User | null>(null);
  habitsRef.current = habits;
  entriesRef.current = entries;
  userRef.current = user;

  const persist = useCallback((hs: Habit[], es: Set<string>) => {
    writeCache({ habits: hs, entries: [...es].map(splitKey) });
  }, []);

  const applyHabits = useCallback((next: Habit[]) => {
    setHabits(next);
    habitsRef.current = next;
    persist(next, entriesRef.current);
  }, [persist]);

  const applyEntries = useCallback((next: Set<string>) => {
    setEntries(next);
    entriesRef.current = next;
    persist(habitsRef.current, next);
  }, [persist]);

  /** Queue an op that failed to reach the server, to retry when we are back. */
  const enqueue = useCallback((op: Op) => {
    const ops = [...readQueue(), op];
    writeQueue(ops);
    setQueued(ops.length);
    setOffline(true);
  }, []);

  const send = useCallback(async (op: Op): Promise<boolean> => {
    const post = (url: string, body: unknown, method = "POST") =>
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    try {
      let res: Response;
      if (op.kind === "habit.add") {
        res = await post("/api/habits", {
          name: op.habit.name, color: op.habit.color, description: op.habit.description,
        });
      } else if (op.kind === "habit.update") {
        res = await post(`/api/habits/${op.id}`, op.patch, "PATCH");
      } else if (op.kind === "habit.delete") {
        res = await fetch(`/api/habits/${op.id}`, { method: "DELETE" });
      } else {
        res = await post("/api/entries", { habitId: op.habitId, day: op.day, done: op.done });
      }
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const load = useCallback(async () => {
    // Paint from cache first so the calendar is never blank on a cold load.
    const cached = readCache();
    if (cached.habits.length || cached.entries.length) {
      setHabits(cached.habits);
      habitsRef.current = cached.habits;
      const cachedSet = new Set(cached.entries.map((e) => ek(e.habitId, e.day)));
      setEntries(cachedSet);
      entriesRef.current = cachedSet;
    }
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const data = await res.json();
      setCloudEnabled(Boolean(data.cloudEnabled));
      setUser(data.user ?? null);
      userRef.current = data.user ?? null;
      if (data.user) {
        const hs = (data.habits ?? []) as Habit[];
        const es = new Set(((data.entries ?? []) as Entry[]).map((e) => ek(e.habitId, e.day)));
        setHabits(hs);
        habitsRef.current = hs;
        setEntries(es);
        entriesRef.current = es;
        persist(hs, es);
      }
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setReady(true);
    }
  }, [persist]);

  /** Drain the offline queue whenever the network or the tab comes back. */
  const flush = useCallback(async () => {
    if (!userRef.current) return;
    const ops = readQueue();
    if (!ops.length) return;
    const remaining: Op[] = [];
    for (const op of ops) {
      const ok = await send(op);
      if (!ok) remaining.push(op);
    }
    writeQueue(remaining);
    setQueued(remaining.length);
    setOffline(remaining.length > 0);
    if (remaining.length === 0) await load();
  }, [send, load]);

  useEffect(() => {
    void load();
    setQueued(readQueue().length);
  }, [load]);

  useEffect(() => {
    const onOnline = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flush]);

  const addHabit = useCallback<Store["addHabit"]>(async ({ name, color, description }) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const optimistic: Habit = {
      id: uid(), name: trimmed, color, description: description.trim(),
      archived: false, sortOrder: habitsRef.current.length, createdAt: new Date().toISOString(),
    };
    applyHabits([...habitsRef.current, optimistic]);

    if (!userRef.current) return optimistic;
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color, description: optimistic.description }),
      });
      if (!res.ok) throw new Error("request failed");
      const { habit } = (await res.json()) as { habit: Habit };
      // Swap the temporary id for the server one, carrying any entries across.
      applyHabits(habitsRef.current.map((h) => (h.id === optimistic.id ? habit : h)));
      const prefix = `${optimistic.id}|`;
      if ([...entriesRef.current].some((k) => k.startsWith(prefix))) {
        const next = new Set<string>();
        for (const k of entriesRef.current) {
          next.add(k.startsWith(prefix) ? ek(habit.id, k.slice(prefix.length)) : k);
        }
        applyEntries(next);
      }
      return habit;
    } catch {
      enqueue({ kind: "habit.add", habit: optimistic });
      return optimistic;
    }
  }, [applyHabits, applyEntries, enqueue]);

  const updateHabit = useCallback<Store["updateHabit"]>((id, patch) => {
    applyHabits(habitsRef.current.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    if (!userRef.current) return;
    void send({ kind: "habit.update", id, patch }).then((ok) => {
      if (!ok) enqueue({ kind: "habit.update", id, patch });
    });
  }, [applyHabits, send, enqueue]);

  const deleteHabit = useCallback<Store["deleteHabit"]>((id) => {
    applyHabits(habitsRef.current.filter((h) => h.id !== id));
    applyEntries(new Set([...entriesRef.current].filter((k) => !k.startsWith(`${id}|`))));
    if (!userRef.current) return;
    void send({ kind: "habit.delete", id }).then((ok) => {
      if (!ok) enqueue({ kind: "habit.delete", id });
    });
  }, [applyHabits, applyEntries, send, enqueue]);

  const setEntry = useCallback<Store["setEntry"]>((habitId, day, done) => {
    const next = new Set(entriesRef.current);
    if (done) next.add(ek(habitId, day));
    else next.delete(ek(habitId, day));
    applyEntries(next);
    if (!userRef.current) return;
    void send({ kind: "entry.set", habitId, day, done }).then((ok) => {
      if (!ok) enqueue({ kind: "entry.set", habitId, day, done });
    });
  }, [applyEntries, send, enqueue]);

  const toggleEntry = useCallback<Store["toggleEntry"]>((habitId, day) => {
    setEntry(habitId, day, !entriesRef.current.has(ek(habitId, day)));
  }, [setEntry]);

  const exportSnapshot = useCallback<Store["exportSnapshot"]>(() => ({
    habits: habitsRef.current,
    entries: [...entriesRef.current].map(splitKey),
  }), []);

  const importSnapshot = useCallback<Store["importSnapshot"]>(async (snap) => {
    if (userRef.current) {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snap),
      });
      if (!res.ok) return "Import failed.";
      const out = (await res.json()) as { habitsAdded: number; entriesAdded: number };
      await load();
      return `Imported ${out.habitsAdded} habits and ${out.entriesAdded} days.`;
    }

    // Local merge: habits match on name so a re-import never duplicates.
    const before = habitsRef.current.length;
    const byName = new Map(habitsRef.current.map((h) => [h.name.toLowerCase(), h]));
    const remap = new Map<string, string>();
    const nextHabits = [...habitsRef.current];
    for (const h of snap.habits ?? []) {
      const name = String(h.name ?? "").trim();
      if (!name) continue;
      const hit = byName.get(name.toLowerCase());
      if (hit) {
        remap.set(h.id, hit.id);
        continue;
      }
      const created: Habit = {
        id: uid(), name, color: h.color ?? "#e5e7eb", description: h.description ?? "",
        archived: Boolean(h.archived), sortOrder: nextHabits.length, createdAt: new Date().toISOString(),
      };
      nextHabits.push(created);
      byName.set(name.toLowerCase(), created);
      remap.set(h.id, created.id);
    }
    const liveIds = new Set(nextHabits.map((h) => h.id));
    const nextEntries = new Set(entriesRef.current);
    let added = 0;
    for (const e of snap.entries ?? []) {
      const target = remap.get(e.habitId) ?? (liveIds.has(e.habitId) ? e.habitId : null);
      if (!target || !DAY_RE.test(e.day)) continue;
      if (!nextEntries.has(ek(target, e.day))) added++;
      nextEntries.add(ek(target, e.day));
    }
    applyHabits(nextHabits);
    applyEntries(nextEntries);
    return `Imported ${nextHabits.length - before} habits and ${added} days.`;
  }, [load, applyHabits, applyEntries]);

  const login = useCallback<Store["login"]>(async (email, password, mode) => {
    try {
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return String(data.error ?? "Something went wrong.");

      // Carry anything tracked before signing in up into the account.
      const local = readCache();
      if (local.habits.length) {
        await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(local),
        }).catch(() => null);
      }
      await load();
      return null;
    } catch {
      return "Cannot reach the server. Check your connection.";
    }
  }, [load]);

  const logout = useCallback<Store["logout"]>(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    try {
      window.localStorage.removeItem(CACHE_KEY);
      window.localStorage.removeItem(QUEUE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    userRef.current = null;
    setHabits([]);
    habitsRef.current = [];
    setEntries(new Set());
    entriesRef.current = new Set();
    setQueued(0);
  }, []);

  const value = useMemo<Store>(() => ({
    ready, cloudEnabled, user, habits, entries, offline, queued,
    addHabit, updateHabit, deleteHabit, setEntry, toggleEntry,
    login, logout, exportSnapshot, importSnapshot, refresh: load,
  }), [ready, cloudEnabled, user, habits, entries, offline, queued,
    addHabit, updateHabit, deleteHabit, setEntry, toggleEntry,
    login, logout, exportSnapshot, importSnapshot, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

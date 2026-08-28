import { neon } from "@neondatabase/serverless";

/**
 * The app is usable with no database at all: without DATABASE_URL it runs
 * local-only in the browser, and every API route short-circuits to 503.
 * That keeps the deployed URL working the moment it goes live, before a
 * Postgres store has been attached.
 */
export const dbUrl = process.env.DATABASE_URL ?? "";
export const cloudEnabled = dbUrl.length > 0;

type Sql = ReturnType<typeof neon>;
let client: Sql | null = null;

export function sql(): Sql {
  if (!cloudEnabled) throw new Error("NO_DATABASE");
  if (!client) client = neon(dbUrl);
  return client;
}

let ready: Promise<void> | null = null;

/**
 * Create the schema on first use. Cheap enough to await per cold start and it
 * removes the need for a separate migration step on a one-person app.
 */
export function ensureSchema(): Promise<void> {
  if (!ready) ready = migrate();
  return ready;
}

async function migrate(): Promise<void> {
  const q = sql();
  await q`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await q`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    )`;
  await q`
    CREATE TABLE IF NOT EXISTS habits (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#e5e7eb',
      description TEXT NOT NULL DEFAULT '',
      archived    BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await q`
    CREATE TABLE IF NOT EXISTS entries (
      user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      day      DATE NOT NULL,
      PRIMARY KEY (habit_id, day)
    )`;
  await q`CREATE INDEX IF NOT EXISTS entries_user_day ON entries (user_id, day)`;
  await q`CREATE INDEX IF NOT EXISTS habits_user ON habits (user_id, sort_order)`;
  await q`CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)`;
}

/** Postgres DATE comes back as a Date or a string depending on the driver path. */
export function dayKey(value: unknown): string {
  if (value instanceof Date) {
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${value.getUTCFullYear()}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

import { sql } from "@/lib/db";
import { newId } from "@/lib/auth";
import { json, fail, requireUser, readJson } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

type InHabit = { id?: string; name?: string; color?: string; description?: string; archived?: boolean };
type InEntry = { habitId?: string; day?: string };

/**
 * Bulk merge, used for restoring a JSON backup and for pushing browser-local
 * data up the first time an account signs in. Habits match on name, so
 * re-importing the same file twice doesn't duplicate anything.
 */
export async function POST(req: Request) {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;
  const uid = guard.user.id;

  const body = await readJson(req);
  const habits = Array.isArray(body.habits) ? (body.habits as InHabit[]) : [];
  const entries = Array.isArray(body.entries) ? (body.entries as InEntry[]) : [];
  if (!habits.length && !entries.length) return fail("Nothing to import.");

  const existing = (await sql()`
    SELECT id, name FROM habits WHERE user_id = ${uid}`) as Array<{ id: string; name: string }>;
  const byName = new Map(existing.map((h) => [h.name.toLowerCase(), h.id]));
  const liveIds = new Set(existing.map((h) => h.id));

  const maxRows = (await sql()`
    SELECT COALESCE(MAX(sort_order), -1) AS m FROM habits WHERE user_id = ${uid}`) as Array<{ m: number }>;
  let order = Number(maxRows[0]?.m ?? -1) + 1;

  // Old id -> live id, so incoming entries can be re-pointed.
  const remap = new Map<string, string>();
  let habitsAdded = 0;

  for (const h of habits) {
    const name = String(h.name ?? "").trim().slice(0, 80);
    if (!name) continue;
    const hit = byName.get(name.toLowerCase());
    if (hit) {
      if (h.id) remap.set(h.id, hit);
      continue;
    }
    const id = newId("h_");
    await sql()`
      INSERT INTO habits (id, user_id, name, color, description, archived, sort_order)
      VALUES (${id}, ${uid}, ${name}, ${String(h.color ?? "#e5e7eb")},
              ${String(h.description ?? "").slice(0, 2000)}, ${Boolean(h.archived)}, ${order++})`;
    byName.set(name.toLowerCase(), id);
    liveIds.add(id);
    if (h.id) remap.set(h.id, id);
    habitsAdded++;
  }

  let entriesAdded = 0;
  for (const e of entries) {
    const day = String(e.day ?? "");
    const src = String(e.habitId ?? "");
    const habitId = remap.get(src) ?? (liveIds.has(src) ? src : undefined);
    if (!habitId || !DAY.test(day)) continue;
    await sql()`
      INSERT INTO entries (user_id, habit_id, day) VALUES (${uid}, ${habitId}, ${day})
      ON CONFLICT (habit_id, day) DO NOTHING`;
    entriesAdded++;
  }

  return json({ ok: true, habitsAdded, entriesAdded });
}

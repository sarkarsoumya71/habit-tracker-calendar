import { sql, ensureSchema, cloudEnabled, dayKey } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { json } from "@/lib/api";
import type { Habit, Entry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One bootstrap call: who am I, and everything I've tracked. */
export async function GET() {
  if (!cloudEnabled) return json({ cloudEnabled: false, user: null, habits: [], entries: [] });

  const user = await currentUser();
  if (!user) return json({ cloudEnabled: true, user: null, habits: [], entries: [] });

  await ensureSchema();
  const habitRows = (await sql()`
    SELECT id, name, color, description, archived, sort_order, created_at
      FROM habits WHERE user_id = ${user.id}
     ORDER BY sort_order ASC, created_at ASC`) as Array<Record<string, unknown>>;
  const entryRows = (await sql()`
    SELECT habit_id, day FROM entries WHERE user_id = ${user.id}`) as Array<Record<string, unknown>>;

  const habits: Habit[] = habitRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    color: String(r.color),
    description: String(r.description ?? ""),
    archived: Boolean(r.archived),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
  const entries: Entry[] = entryRows.map((r) => ({
    habitId: String(r.habit_id),
    day: dayKey(r.day),
  }));

  return json({ cloudEnabled: true, user, habits, entries });
}

import { sql } from "@/lib/db";
import { json, fail, requireUser, readJson, str, bool } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Idempotent set/clear of one completion, so retries after an offline queue are safe. */
export async function POST(req: Request) {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;

  const body = await readJson(req);
  const habitId = str(body.habitId);
  const day = str(body.day);
  const done = bool(body.done, true);
  if (!habitId || !DAY.test(day)) return fail("Bad habit or day.");

  const owned = (await sql()`
    SELECT id FROM habits WHERE id = ${habitId} AND user_id = ${guard.user.id}`) as Array<{ id: string }>;
  if (!owned.length) return fail("Habit not found.", 404);

  if (done) {
    await sql()`
      INSERT INTO entries (user_id, habit_id, day) VALUES (${guard.user.id}, ${habitId}, ${day})
      ON CONFLICT (habit_id, day) DO NOTHING`;
  } else {
    await sql()`DELETE FROM entries WHERE habit_id = ${habitId} AND day = ${day} AND user_id = ${guard.user.id}`;
  }
  return json({ ok: true, habitId, day, done });
}

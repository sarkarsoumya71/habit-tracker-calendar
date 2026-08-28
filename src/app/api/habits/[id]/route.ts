import { sql } from "@/lib/db";
import { json, fail, requireUser, readJson, str, bool } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const body = await readJson(req);

  const owned = (await sql()`
    SELECT name, color, description, archived, sort_order
      FROM habits WHERE id = ${id} AND user_id = ${guard.user.id}`) as Array<Record<string, unknown>>;
  const current = owned[0];
  if (!current) return fail("Habit not found.", 404);

  const name = str(body.name, String(current.name)).trim().slice(0, 80) || String(current.name);
  const color = str(body.color, String(current.color));
  const description = str(body.description, String(current.description ?? "")).slice(0, 2000);
  const archived = bool(body.archived, Boolean(current.archived));
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : Number(current.sort_order ?? 0);

  await sql()`
    UPDATE habits SET name = ${name}, color = ${color}, description = ${description},
                      archived = ${archived}, sort_order = ${sortOrder}
     WHERE id = ${id} AND user_id = ${guard.user.id}`;
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  // entries cascade via the FK, so the completions go with it.
  await sql()`DELETE FROM habits WHERE id = ${id} AND user_id = ${guard.user.id}`;
  return json({ ok: true });
}

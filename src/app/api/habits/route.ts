import { sql } from "@/lib/db";
import { newId } from "@/lib/auth";
import { json, fail, requireUser, readJson, str } from "@/lib/api";
import type { Habit } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requireUser();
  if ("response" in guard) return guard.response;

  const body = await readJson(req);
  const name = str(body.name).trim();
  if (!name) return fail("A habit needs a name.");

  const color = str(body.color, "#e5e7eb");
  const description = str(body.description).trim();
  const id = newId("h_");

  const maxRows = (await sql()`
    SELECT COALESCE(MAX(sort_order), -1) AS m FROM habits WHERE user_id = ${guard.user.id}`) as Array<{ m: number }>;
  const sortOrder = Number(maxRows[0]?.m ?? -1) + 1;

  await sql()`
    INSERT INTO habits (id, user_id, name, color, description, sort_order)
    VALUES (${id}, ${guard.user.id}, ${name.slice(0, 80)}, ${color}, ${description.slice(0, 2000)}, ${sortOrder})`;

  const habit: Habit = {
    id, name: name.slice(0, 80), color, description: description.slice(0, 2000),
    archived: false, sortOrder, createdAt: new Date().toISOString(),
  };
  return json({ habit });
}

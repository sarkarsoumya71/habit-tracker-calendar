import { sql, ensureSchema, cloudEnabled } from "@/lib/db";
import { verifyPassword, createSession, normalizeEmail } from "@/lib/auth";
import { json, fail, noCloud, readJson, str } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudEnabled) return noCloud();
  const body = await readJson(req);
  const email = normalizeEmail(str(body.email));
  const password = str(body.password);

  await ensureSchema();
  const rows = (await sql()`
    SELECT id, email, password_hash FROM users WHERE email = ${email}`) as Array<{
    id: string; email: string; password_hash: string;
  }>;
  const row = rows[0];
  // Same message either way, so the form can't be used to enumerate accounts.
  if (!row || !verifyPassword(password, row.password_hash)) {
    return fail("Email or password is incorrect.", 401);
  }
  await createSession(row.id);
  return json({ user: { id: row.id, email: row.email } });
}

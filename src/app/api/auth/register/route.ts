import { sql, ensureSchema, cloudEnabled } from "@/lib/db";
import { hashPassword, createSession, newId, normalizeEmail, emailLooksValid } from "@/lib/auth";
import { json, fail, noCloud, readJson, str } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!cloudEnabled) return noCloud();
  const body = await readJson(req);
  const email = normalizeEmail(str(body.email));
  const password = str(body.password);

  if (!emailLooksValid(email)) return fail("Enter a valid email address.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");

  await ensureSchema();
  const existing = (await sql()`SELECT id FROM users WHERE email = ${email}`) as Array<{ id: string }>;
  if (existing.length) return fail("That email already has an account. Sign in instead.", 409);

  const id = newId("u_");
  await sql()`INSERT INTO users (id, email, password_hash) VALUES (${id}, ${email}, ${hashPassword(password)})`;
  await createSession(id);
  return json({ user: { id, email } });
}

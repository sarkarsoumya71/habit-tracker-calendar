import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { sql, ensureSchema, dbUrl } from "./db";
import type { User } from "./types";

export const SESSION_COOKIE = "htc_session";
const SESSION_DAYS = 400;

export function newId(prefix = ""): string {
  return prefix + randomBytes(12).toString("hex");
}

/** scrypt with a per-password salt, stored as "salt:hash". */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Session tokens are random and stored server-side, so there is no signing key
 * to manage. The DB row is the source of truth; the cookie is just a pointer.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await sql()`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expires.toISOString()})`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await sql()`DELETE FROM sessions WHERE token = ${token}`;
    } catch {
      // A failed cleanup must not block the user from logging out.
    }
  }
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user, or null. Also lazily prunes expired sessions. */
export async function currentUser(): Promise<User | null> {
  if (!dbUrl) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    await ensureSchema();
    const rows = (await sql()`
      SELECT u.id, u.email, s.expires_at
        FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ${token}`) as Array<{ id: string; email: string; expires_at: string }>;
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await sql()`DELETE FROM sessions WHERE token = ${token}`;
      return null;
    }
    return { id: row.id, email: row.email };
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Stable per-account colour seed for the avatar chip. */
export function avatarHue(email: string): number {
  const h = createHash("sha1").update(email).digest();
  return h[0] % 360;
}

import { NextResponse } from "next/server";
import { cloudEnabled } from "./db";
import { currentUser } from "./auth";
import type { User } from "./types";

export const json = <T,>(body: T, status = 200) => NextResponse.json(body, { status });

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** 503 with a code the client uses to fall back to local-only mode. */
export const noCloud = () =>
  NextResponse.json({ error: "NO_DATABASE", cloudEnabled: false }, { status: 503 });

type Guarded = { user: User } | { response: NextResponse };

export async function requireUser(): Promise<Guarded> {
  if (!cloudEnabled) return { response: noCloud() };
  const user = await currentUser();
  if (!user) return { response: fail("UNAUTHORIZED", 401) };
  return { user };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
export const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);

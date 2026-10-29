import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export async function createSession(
  data: SessionData,
  database: Pick<typeof db, "insert"> = db,
): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await database.insert(sessionsTable).values({
    sid,
    sess: data as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + SESSION_TTL),
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.sid, sid));

  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }

  return row.sess as unknown as SessionData;
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  await db
    .update(sessionsTable)
    .set({
      sess: data as unknown as Record<string, unknown>,
      expire: new Date(Date.now() + SESSION_TTL),
    })
    .where(eq(sessionsTable.sid, sid));
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function revokeUserSessions(
  userId: string,
  database: Pick<typeof db, "delete"> = db,
): Promise<void> {
  await database.delete(sessionsTable).where(sql`${sessionsTable.sess}->'user'->>'id' = ${userId}`);
}

type AuthAction = "login" | "register" | "forgot_password" | "reset_password" | "resend_verification";
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const authAttempts = new Map<string, { count: number; expiresAt: number }>();
let lastAttemptCleanup = 0;
const AUTH_LIMITS: Record<AuthAction, { ip: number; identity: number }> = {
  login: { ip: 50, identity: 10 },
  register: { ip: 20, identity: 3 },
  forgot_password: { ip: 20, identity: 3 },
  reset_password: { ip: 30, identity: 10 },
  resend_verification: { ip: 20, identity: 3 },
};

// shortcut: limits are per process; add a shared edge limiter before scaling to multiple instances.
export function limitAuthAttempts(req: Request, res: Response, action: AuthAction): boolean {
  const now = Date.now();
  if (now - lastAttemptCleanup >= 60_000) {
    for (const [key, bucket] of authAttempts) {
      if (bucket.expiresAt <= now) authAttempts.delete(key);
    }
    lastAttemptCleanup = now;
  }

  const limits = AUTH_LIMITS[action];
  const rawIdentity = action === "reset_password" ? req.body?.token : req.body?.email;
  const identity = typeof rawIdentity === "string" ? rawIdentity.trim().toLowerCase().slice(0, 1024) : "";
  const keys = [{ key: `${action}:ip:${req.ip || req.socket?.remoteAddress || "unknown"}`, limit: limits.ip }];
  if (identity) {
    keys.push({ key: `${action}:identity:${crypto.createHash("sha256").update(identity).digest("hex")}`, limit: limits.identity });
  }

  for (const { key, limit } of keys) {
    const bucket = authAttempts.get(key);
    if ((bucket && bucket.expiresAt > now && bucket.count >= limit) || (!bucket && authAttempts.size >= 20_000)) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(((bucket?.expiresAt ?? now + 60_000) - now) / 1000))));
      res.status(429).json({ error: "Too many attempts. Please try again later." });
      return false;
    }
  }
  for (const { key } of keys) {
    const bucket = authAttempts.get(key);
    authAttempts.set(key, bucket && bucket.expiresAt > now
      ? { ...bucket, count: bucket.count + 1 }
      : { count: 1, expiresAt: now + AUTH_WINDOW_MS });
  }
  return true;
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}

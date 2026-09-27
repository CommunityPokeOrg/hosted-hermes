import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { getStore } from "@/lib/store";
import type { Session, User } from "@/lib/models";

import { SESSION_COOKIE } from "./constants";
export { SESSION_COOKIE };

export function createSession(userId: string): { session: Session; maxAge: number } {
  const ttl = loadConfig().sessionTtlSeconds;
  const session: Session = {
    token: randomBytes(32).toString("base64url"),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
  };
  getStore().createSession(session);
  return { session, maxAge: ttl };
}

export function destroySession(token: string): void {
  getStore().deleteSession(token);
}

export function setSessionCookie(res: NextResponse, token: string, maxAge: number): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function getSessionFromRequest(req: NextRequest): Session | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return token ? getStore().getSession(token) : null;
}

/**
 * Resolve the currently signed-in user inside a server component or route
 * handler. Returns null when not authenticated.
 */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = getStore().getSession(token);
  return session ? getStore().getUser(session.userId) : null;
}

/** Route-handler helper: returns the authed user or a 401 Response. */
export function requireUser(req: NextRequest): { user: User } | { response: NextResponse } {
  const session = getSessionFromRequest(req);
  const user = session ? getStore().getUser(session.userId) : null;
  if (!user) {
    return {
      response: Response.json({ error: "unauthorized" }, { status: 401 }) as NextResponse,
    };
  }
  return { user };
}

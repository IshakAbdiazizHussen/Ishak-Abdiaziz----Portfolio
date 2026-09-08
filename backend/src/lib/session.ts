import type { Request, Response } from "express";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config, isProd } from "../config";
import { redis } from "./redis";

/**
 * Admin session: an opaque random ID, signed into an HttpOnly cookie and stored
 * in Redis so it is revocable (logout / TTL / manual eviction).
 *
 * Cookie is `HttpOnly; Secure(prod); SameSite=Lax; Path=/` with NO `Domain`
 * attribute (a host-only cookie). The frontend proxies every browser→backend
 * call through its own origin (`/api/backend/*`, a Next.js rewrite), so the
 * `Set-Cookie` the browser receives comes from the frontend's own origin and
 * the cookie is first-party — `SameSite=Lax` is sufficient and a cross-site
 * `SameSite=None` cookie (blocked by Safari/ITP) is not needed. See
 * docs/architecture.md §13 and constraint C4b.
 *
 * `COOKIE_DOMAIN` stays supported but MUST be left unset while the proxy is in
 * use — setting `Domain=` to anything other than the frontend's host would stop
 * the browser accepting the proxied `Set-Cookie`. It only becomes relevant if
 * the deployment later moves to a real shared parent domain
 * (yourdomain.com + api.yourdomain.com) and drops the proxy.
 *
 * FAIL CLOSED: any error reading a session (missing/tampered cookie, Redis miss,
 * Redis error) yields `null` — never a partially-trusted request.
 */

export interface SessionData {
  id: string;
  createdAt: string;
  uaHash: string;
}

const COOKIE_NAME = "sid";
const KEY_PREFIX = "session:";

function mac(id: string): string {
  return createHmac("sha256", config.SESSION_SECRET).update(id).digest("base64url");
}

function sign(id: string): string {
  return `${id}.${mac(id)}`;
}

/** Returns the session id iff the signature verifies (constant-time), else null. */
function unsign(value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  const provided = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(mac(id));
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? id : null;
}

function uaHash(req: Request): string {
  return createHash("sha256")
    .update(req.get("user-agent") ?? "")
    .digest("hex")
    .slice(0, 32);
}

function cookieBase() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
}

function setCookie(res: Response, id: string): void {
  res.cookie(COOKIE_NAME, sign(id), {
    ...cookieBase(),
    maxAge: config.SESSION_TTL_SECONDS * 1000,
  });
}

function readRawCookie(req: Request): string | null {
  const raw = (req.cookies as Record<string, unknown> | undefined)?.[COOKIE_NAME];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export async function createSession(req: Request, res: Response): Promise<void> {
  const id = randomBytes(32).toString("base64url");
  const data: SessionData = {
    id,
    createdAt: new Date().toISOString(),
    uaHash: uaHash(req),
  };
  await redis.set(`${KEY_PREFIX}${id}`, JSON.stringify(data), { ex: config.SESSION_TTL_SECONDS });
  setCookie(res, id);
}

/**
 * Verify the cookie and load the session. On success the TTL slides forward
 * (Redis EXPIRE + a fresh Set-Cookie) so an active session does not expire
 * abruptly at the fixed boundary. Throws only if Redis itself errors — callers
 * (requireAdmin) treat that as unauthenticated.
 */
export async function readSession(req: Request, res: Response): Promise<SessionData | null> {
  const raw = readRawCookie(req);
  if (!raw) return null;

  const id = unsign(raw);
  if (!id) return null;

  const json = await redis.get<string>(`${KEY_PREFIX}${id}`);
  if (!json) return null;

  let data: SessionData;
  try {
    data = JSON.parse(json) as SessionData;
  } catch {
    return null;
  }

  // Sliding expiration — best effort; a failure here must not deny access.
  try {
    await redis.expire(`${KEY_PREFIX}${id}`, config.SESSION_TTL_SECONDS);
    setCookie(res, id);
  } catch {
    /* ignore */
  }

  return data;
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const raw = readRawCookie(req);
  if (raw) {
    const id = unsign(raw);
    if (id) {
      try {
        await redis.del(`${KEY_PREFIX}${id}`);
      } catch {
        /* ignore — cookie is cleared regardless */
      }
    }
  }
  res.clearCookie(COOKIE_NAME, cookieBase());
}

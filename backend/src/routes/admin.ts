import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { config } from "../config";
import { createSession, destroySession } from "../lib/session";
import { limit, resetLimit } from "../lib/rateLimit";
import { requireAdmin } from "../middleware/requireAdmin";
import { badRequest } from "../lib/errors";

export const adminRouter = Router();

const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

const LOGIN_MAX = 5;
const LOGIN_WINDOW_SEC = 900;
const FAILURE_DELAY_MS = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Constant-time string compare that does not leak length via early return. */
function passwordMatches(candidate: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(config.ADMIN_PASSWORD);
  if (a.length !== b.length) {
    timingSafeEqual(a, a); // keep the work roughly constant
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * POST /api/admin/login
 * Rate limit BEFORE the compare (every attempt counts); constant-time compare;
 * on success reset the limiter and issue a session.
 */
adminRouter.post("/login", async (req, res, next) => {
  try {
    const ip = req.ip ?? "unknown";
    await limit("login", ip, LOGIN_MAX, LOGIN_WINDOW_SEC); // throws 429 / 503

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      await sleep(FAILURE_DELAY_MS);
      throw badRequest("Invalid request");
    }

    if (!passwordMatches(parsed.data.password)) {
      await sleep(FAILURE_DELAY_MS);
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    await resetLimit("login", ip);
    await createSession(req, res);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/logout — always succeeds; clears the cookie + Redis record. */
adminRouter.post("/logout", async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/session — 200 iff the caller has a valid session.
 * The frontend admin area uses this on load to decide login vs. entry form.
 */
adminRouter.get("/session", requireAdmin, (_req, res) => {
  res.status(200).json({ ok: true });
});

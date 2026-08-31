import type { RequestHandler } from "express";
import { readSession } from "../lib/session";
import { unauthorized } from "../lib/errors";

/**
 * Gate for admin-only routes. FAIL CLOSED: any problem verifying the session —
 * missing/tampered cookie, Redis miss, Redis error — results in 401.
 */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    const session = await readSession(req, res);
    if (!session) {
      next(unauthorized());
      return;
    }
    req.session = session;
    next();
  } catch {
    next(unauthorized());
  }
};

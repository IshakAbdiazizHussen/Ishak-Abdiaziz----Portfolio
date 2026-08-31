import type { SessionData } from "../lib/session";

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAdmin` once a valid admin session is verified. */
      session?: SessionData;
    }
  }
}

export {};

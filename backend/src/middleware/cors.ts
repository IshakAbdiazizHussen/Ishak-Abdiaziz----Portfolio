import cors from "cors";
import { config } from "../config";

/**
 * CORS is an exact-match allowlist from `CORS_ALLOWED_ORIGINS` — never `*`.
 * `credentials: true` is required for the same-site `sid` cookie and is
 * incompatible with `*`, so the allowlist must stay explicit.
 *
 * A disallowed Origin gets no `Access-Control-Allow-Origin` header (the request
 * is not rejected with an error — the browser blocks the response). Requests
 * with no Origin header (curl, server-to-server, same-origin) are allowed
 * through; they are still gated by auth where it matters.
 */
const allowed = new Set(config.CORS_ALLOWED_ORIGINS);

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowed.has(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 600,
});

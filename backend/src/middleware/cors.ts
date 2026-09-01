import cors from "cors";
import { config } from "../config";
import { makeOriginCheck } from "../lib/originAllowlist";

/**
 * CORS is an exact-match allowlist from `CORS_ALLOWED_ORIGINS` — never `*`.
 * `credentials: true` is required for the same-site `sid` cookie and is
 * incompatible with `*`, so the allowlist must stay explicit.
 *
 * A disallowed Origin gets no `Access-Control-Allow-Origin` header — the request
 * is not rejected server-side, the browser blocks the response. Requests with no
 * Origin (curl, server-to-server, same-origin navigations) pass through here and
 * are still gated by `requireAdmin` where it matters. CORS is a browser control,
 * not the auth boundary.
 *
 * `CORS_PREVIEW_ORIGIN_REGEX` (optional): an Origin matching it is allowed so the
 * PUBLIC endpoints work on Vercel preview URLs. Admin still won't work there —
 * the cookie is cross-site. See docs/architecture.md §9.
 */
const isAllowedOrigin = makeOriginCheck(
  config.CORS_ALLOWED_ORIGINS,
  config.CORS_PREVIEW_ORIGIN_REGEX,
);

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 600,
});

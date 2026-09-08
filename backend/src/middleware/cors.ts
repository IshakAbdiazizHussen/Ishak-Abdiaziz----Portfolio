import cors from "cors";
import { config } from "../config";
import { makeOriginCheck } from "../lib/originAllowlist";

/**
 * CORS is an exact-match allowlist from `CORS_ALLOWED_ORIGINS` — never `*`.
 * `credentials: true` is kept for the `sid` cookie; it is incompatible with
 * `*`, so the allowlist stays explicit.
 *
 * SINCE THE FRONTEND SAME-ORIGIN PROXY (docs/architecture.md §13): the browser
 * never calls this API cross-origin any more. Authed calls and public browser
 * calls (contact form, admin Log list) all go to the frontend's own
 * `/api/backend/*` path, which Vercel rewrites server-side — the browser sees a
 * same-origin request and runs no CORS check. Public GETs during ISR/SSR are
 * server-to-server (no `Origin`). So CORS here is now DEFENSE-IN-DEPTH, not
 * load-bearing: the app works even if `CORS_ALLOWED_ORIGINS` does not contain
 * the production frontend origin. Keep it pointed at the real frontend origin
 * anyway — it still gates any stray direct browser call and costs nothing.
 *
 * A disallowed Origin gets no `Access-Control-Allow-Origin` header — the request
 * is not rejected server-side, the browser blocks the response. Requests with no
 * Origin (curl, server-to-server, same-origin navigations) pass through here and
 * are still gated by `requireAdmin` where it matters. CORS is a browser control,
 * not the auth boundary.
 *
 * `CORS_PREVIEW_ORIGIN_REGEX` (optional): likewise now redundant with the proxy
 * (preview frontends proxy through their own origin too) but harmless to set.
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
  // PUT: content areas (feature 13) + editing a Log entry.
  // DELETE: removing a Log entry.
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 600,
});

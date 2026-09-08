/**
 * The single entry point for talking to the backend. Every request to the API
 * goes through here — nothing else in the frontend calls `fetch` against the
 * backend directly (constraint C3).
 *
 * Two ways out, picked automatically by where the code runs:
 *
 *  - **In the browser** (client components: admin panel, contact form, the
 *    admin Log list) the request goes to a SAME-ORIGIN path, `/api/backend/*`,
 *    which `next.config.ts`'s `rewrites()` proxies to the real backend
 *    server-side on Vercel. The browser only ever sees its own origin, so the
 *    `sid` session cookie is a first-party `SameSite=Lax` cookie — no
 *    cross-site cookie, no CORS. See `docs/architecture.md` §13 / constraint
 *    C4b.
 *
 *  - **On the server** (RSC / SSR / ISR / build: `lib/content.ts`, `lib/log.ts`
 *    during static generation) there is no origin to be same-as, so the request
 *    goes straight to `BACKEND_URL` (a server-only env var — never shipped to
 *    the browser bundle). This path is unchanged by the proxy.
 */

const CLIENT_PREFIX = "/api/backend";

function resolveUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;

  // `typeof window` is statically replaced per bundle, so the unused branch —
  // and its `process.env.BACKEND_URL` reference — is dropped from the browser
  // build entirely.
  if (typeof window === "undefined") {
    const base = (process.env.BACKEND_URL ?? "").replace(/\/+$/, "");
    if (!base) {
      throw new Error(
        "BACKEND_URL is not set. It is a SERVER-ONLY env var (no NEXT_PUBLIC_ " +
          "prefix) — set it in frontend/.env.local (local: http://localhost:4000) " +
          "and in the frontend's Vercel project (the backend's URL).",
      );
    }
    return `${base}${p}`;
  }

  // Browser: same-origin. `/api/foo` → `/api/backend/foo`; Vercel rewrites it.
  return p.replace(/^\/api\//, `${CLIENT_PREFIX}/`);
}

export interface BackendFetchOptions extends Omit<RequestInit, "credentials"> {
  /**
   * Send the admin session cookie?
   *  - `true`  for authed calls (admin login/session, content/log writes, uploads)
   *  - `false` for public calls (GET /api/log, GET /api/content/*, POST /api/contact)
   *
   * Browser-side these are same-origin now, so `true` → `credentials: "include"`
   * still works and `false` → `"omit"` keeps public GETs cookie-free.
   */
  auth: boolean;
}

export class BackendError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /**
     * The parsed JSON response body, if any — e.g. a 409 from
     * `PUT /api/projects/:id/stats/:statId` carries `{ currentValue }`
     * alongside `error`. Callers that need more than the message read it
     * from here rather than re-fetching.
     */
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export async function backendFetch<T = unknown>(
  path: string,
  { auth, headers, ...init }: BackendFetchOptions,
): Promise<T> {
  const url = resolveUrl(path);

  const res = await fetch(url, {
    ...init,
    credentials: auth ? "include" : "omit",
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new BackendError(res.status, message, body);
  }

  return body as T;
}

# Constraints

Hard rules for this project. These are decisions that have already been made. If a
proposed change conflicts with anything here, the change is wrong, not the constraint.
Changing a constraint requires an explicit, deliberate decision by the owner and an
update to all four docs.

This revision **reverses two constraints** from the previous single-app version:
"no separate backend" and "no Redis." Both are now allowed, but tightly scoped — see
C1 and C2.

`docs/architecture.md` shows *how* the system is built; this file states what it must
never *become*.

---

## C1. There IS a separate backend — and it owns everything sensitive

- The system is **two independent services**: `frontend/` (Next.js, Vercel) and
  `backend/` (Node + Express + TypeScript, Railway). Each has its own `package.json`,
  its own deployment, and its own environment variables.
- **All** business logic, data access, and secrets live in the backend:
  - the only code that connects to Postgres is in the backend;
  - the only code that connects to Redis is in the backend;
  - the only code that uploads to blob storage is in the backend;
  - the only code that calls the email provider is in the backend;
  - the only place `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`, `REDIS_URL`, and
    API keys exist is the backend's environment.
- There are **no Next.js API routes** anywhere. The frontend reaches dynamic behavior
  only by calling the backend's REST API over HTTPS.

## C2. Redis IS present — scoped to exactly two uses

Allowed:

1. **Admin session storage** — `session:<id>` keys, TTL-bound, deleted on logout.
2. **Optional short-TTL cache of the `GET /api/log` response** — one key
   (`cache:log:list`), TTL 30–60s, invalidated on Log write, and it **fails OPEN**
   (a Redis outage must not break the public Log page).

Forbidden:

- ❌ General-purpose caching of any other endpoint, query, or computed value.
- ❌ Caching anything on the frontend — the frontend has no server-side logic, so it
  has nothing to cache. No Redis client, no cache layer in `frontend/`.
- ❌ Rate limiting that fails **open** silently. Any rate limiting in the backend
  **fails CLOSED** (respond `503` if the limiter's backing store is unavailable),
  matching the Ai-image-classifier project's philosophy.
- ❌ Using Redis as a primary data store for anything. Postgres is the source of truth
  for Log entries; Redis is a cache and a session store only.

## C3. The frontend is presentation only

- No database client, no ORM, no direct Postgres/Redis/blob/email SDK calls.
- No secret of any kind. The only env vars the frontend holds are public URLs
  (`NEXT_PUBLIC_BACKEND_URL`, optionally `NEXT_PUBLIC_SITE_URL`).
- No auth logic beyond: send credentials on the relevant fetch calls, and react to the
  backend's `200`/`401`. The frontend never validates the password, never mints a
  session, never reads the session cookie (it is `HttpOnly`).
- No business rules (validation may be mirrored for UX, but the backend is the
  authority — see C9).

## C4. CORS on the backend is locked to known origins

- `Access-Control-Allow-Origin` is an **exact-match allowlist**
  (`CORS_ALLOWED_ORIGINS`): the production frontend origin(s) plus `http://localhost:3000`.
- **Never `*`.** It is also technically incompatible with
  `Access-Control-Allow-Credentials: true`, which the session cookie requires.
- Allowed methods: `GET, POST, OPTIONS`. Allowed headers: `Content-Type`.
- Preview deployments do not get wildcard CORS — use a narrow preview-domain rule or a
  staging backend.
- `trust proxy` on the backend is set to the exact number of proxy hops (Railway = 1),
  **never `true`** — a spoofable `req.ip` defeats the IP-keyed rate limiters.

## C4b. The two services share one registrable domain

- The frontend is served from `<domain>` (and `www.<domain>`); the backend from
  `api.<domain>`. See `docs/architecture.md` §9.
- This is **required**, not cosmetic: it makes admin requests same-site, so the `sid`
  cookie is `SameSite=Lax` with `Domain=.<domain>` and is never a third-party cookie
  (which Safari/ITP blocks and Chrome is phasing out).
- The default platform hostnames (`*.vercel.app`, `*.up.railway.app`) are different
  registrable domains and must not be the production origins for the cookie flow.
- The only sanctioned fallback, if a shared parent domain is ever unavailable, is an
  in-memory bearer token for admin auth (never `localStorage`) — a deliberate,
  documented downgrade, not a default.

## C5. Still exactly one author — no multi-user auth system

- One shared password (`ADMIN_PASSWORD` on the backend), exchanged for a session.
- No user table, no signup, no roles, no permissions matrix, no OAuth, no third-party
  identity provider, no magic links.
- The session is an opaque signed ID in an `HttpOnly; Secure; SameSite=Lax;
  Domain=.<domain>` cookie (same-site because of C4b), backed by a Redis record and
  signed with `SESSION_SECRET`. Logout, TTL, and manual eviction all work; the TTL
  slides forward on each authed request.
- Auth **fails closed**: any error verifying a session (missing/tampered cookie, Redis
  miss, Redis error) means "not authenticated."

## C6. Static pages never fetch the backend at runtime

- **Intro, Built, How I Got Here, and Toolbox** are static-generated by the frontend
  and stay that way. Their content is hardcoded in `frontend/content/`,
  version-controlled, and changes only via a code edit + redeploy.
- These pages must not call `NEXT_PUBLIC_BACKEND_URL`, must not fetch at request time,
  and must not import any backend-calling helper.
- The **only** frontend routes allowed to call the backend are `/log` (calls
  `GET /api/log`), `/lets-talk` (the contact form POST), and `/admin/*` (login + Log
  write + image upload).

## C7. Images are never stored in the database

- Uploaded Log images live **only** in blob storage (Vercel Blob or Cloudinary).
- The Postgres column `image_url` holds a **URL string** and nothing else.
- No base64 blobs, no `bytea` columns, no data URIs persisted to Postgres.

## C8. The locked 6-page structure is unchanged

- The nav is exactly six pages, in this order: **Intro, Built, How I Got Here, Toolbox,
  Log, Let's Talk.** No more, no fewer.
- Any proposed feature, dependency, page, endpoint, or integration must clearly serve
  one of those six pages. If it doesn't, reject it.
- Bias toward deleting. "It would be cool to also…" is a reason to say no. This is a
  sales document, not a platform.

## C9. All external writes are validated server-side (in the backend)

- `POST /api/contact`, `POST /api/log`, `POST /api/log/upload`, and
  `POST /api/admin/login` re-validate and sanitize **all** input on the backend,
  regardless of any client-side validation the frontend does for UX.
- SQL is always parameterized — no string-built queries.
- User-supplied text (Log title/description, contact message) is stored as plain text
  and rendered **escaped** by the frontend, never as raw HTML.
- File uploads are checked for a MIME allowlist, a real file-signature (magic-byte)
  match, and a hard size limit **before** they reach blob storage.
- Every request has a strict body-size limit.

## C10. Static content is code, not data

- All copy for Intro, Built, How I Got Here, and Toolbox is authored in the frontend
  repo (TSX / MDX / config).
- No CMS, no headless content service, no admin UI for anything except the Log.
- The Log admin form is the single exception, and it exists only because Log entries
  are added on an unpredictable schedule between deploys.

## C11. All stats and claims on the Built page must be real and verifiable

- Numbers on the Built page (e.g. 78.2% accuracy, macro F1 0.78, per-category breakdown
  including weak categories like deer ~60%, the weakest class) are **real measured
  values from real runs**. Do not round them up, invent them, or drop the weak ones.
- Every project has a working live demo link and a source link. If a demo is down, fix
  it or remove the claim — no dead "Live demo" buttons.

## C12. Secrets are backend-only

- `DATABASE_URL`, `REDIS_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `RESEND_API_KEY`,
  blob storage tokens, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` are environment
  variables on the **backend** service only.
- Nothing sensitive is prefixed `NEXT_PUBLIC_`. Nothing sensitive appears in the
  frontend bundle or repo.
- `.env*` files (except each service's `.env.example`) are gitignored.

## C13. Rate limiting fails closed

- The contact endpoint and the login endpoint are rate limited.
- If the limiter's backing store is unavailable, the request is **rejected** (`503`),
  never silently allowed through.

## C14. Design constraints (unchanged)

- Dark mode is the default and is fully designed; a light mode is optional and must
  never be the reason a page looks unfinished in dark.
- One accent color, used sparingly. A second accent requires an explicit design
  decision.
- Body copy in a sans-serif; code, stats, and labels in monospace.
- Motion is limited to subtle fade / slide-in and the Intro marquee. No parallax, no
  scroll-jacking, no cursor effects, no confetti.
- Sharp edges over heavy rounding. Generous whitespace.

## C15. No invasive third-party scripts

- No ad networks, no session-replay tools, no heavy tag managers.
- Privacy-friendly, lightweight analytics (e.g. Vercel Analytics on the frontend) is
  permitted; anything that loads a large third-party script or tracks visitors
  invasively is not.

## C16. Dependency discipline

- Frontend: prefer Next.js and platform primitives over adding a library. No
  state-management library for a site with almost no client state; no component
  kitchen-sink.
- Backend: keep it a small, legible Express app. A light query client is fine; an ORM
  heavier than one small table warrants is not. Every dependency is justified against a
  specific endpoint or page.

---

## Quick reject list

Say **no** immediately to any of these unless the owner explicitly reverses the
constraint:

- "Let's add Next.js API routes to the frontend for convenience." (C1)
- "Let's cache the projects/toolbox data in Redis too." (C2)
- "Let's use Redis for rate limiting and just fail open if it's down." (C2, C13)
- "Let's add a Redis client to the frontend." (C2, C3)
- "Let's put the DB client in the frontend so the Log page is faster." (C3)
- "Let's set CORS to `*` so preview deployments work." (C4)
- "Let's set `trust proxy` to `true` so it just works on any host." (C4)
- "Let's just deploy the backend on `*.up.railway.app` and use a `SameSite=None`
  cookie." (C4b)
- "Let's add user accounts / login with GitHub / a second admin." (C5)
- "Let's fetch the Built stats from the backend so they're easier to edit." (C6, C10)
- "Let's store the images in Postgres so there's one less service." (C7)
- "Let's add a blog / projects archive / testimonials / now page." (C8)
- "Let's skip backend validation since the frontend already validates." (C9)
- "Let's put the backend URL config somewhere and also stash the API key next to it." (C12)

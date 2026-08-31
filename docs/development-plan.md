# Development Plan

This plan builds the portfolio as **two independent services**: a `backend/` (Node +
Express + TypeScript, deployed on Railway) and a `frontend/` (Next.js App Router,
deployed on Vercel). Build the backend first so the frontend has real endpoints to call.

## How to read this plan

The work is split into two tracks:

- **BACKEND track** — features 1–4. The REST API, data access, auth, and email.
- **FRONTEND track** — features 5–10. Scaffold, design system, static pages, and the
  pages that call the backend.
- **CROSS-CUTTING** — features 11–12. CORS hardening and deployment of both services.

**Dependency direction:** every frontend feature that does something dynamic depends on
the matching backend endpoint already existing and working.

| Frontend feature | Depends on backend feature |
| --- | --- |
| 8. Let's Talk (contact form) | 4. Contact endpoint |
| 9. Log public page | 3. `GET /api/log` |
| 10. Admin login + Log form | 2. Auth/session endpoints, 3. `POST /api/log` + `POST /api/log/upload` |

Features 5–7 (frontend scaffold, design system, static pages) have **no backend
dependency** and can be built in parallel with the backend track if desired. The
recommended linear order is the numbered one below.

## Every feature block contains, in this order

1. **Read-first statement**
2. **Prompting** — what to tell the AI codebase tool when starting this feature
3. **Security** — security considerations specific to this feature
4. **Implementation** — concrete technical steps
5. **Guidelines** — conventions to follow
6. **Quality assurance** — how to verify it before moving on

The companion documents are `docs/architecture.md`, `docs/constraints.md`, and
`docs/project-definition.md`. They are the source of truth. This plan does not repeat
their content; it points to them.

---

## Feature order

**Backend track**
1. Backend scaffold + Postgres + Redis connections
2. Backend auth & session endpoints
3. Backend Log endpoints (`GET`/`POST /api/log`, `POST /api/log/upload`)
4. Backend contact endpoint

**Frontend track**
5. Frontend scaffold
6. Frontend design system & app shell
7. Frontend static pages (Intro + marquee, Built, How I Got Here, Toolbox)
8. Frontend Let's Talk page — wired to the backend contact endpoint
9. Frontend Log public page — wired to `GET /api/log`
10. Frontend admin login + Log entry form — wired to the backend

**Cross-cutting**
11. CORS hardening between the two services
12. Deployment of both services & launch hardening

---

## 1. Backend scaffold + Postgres + Redis connections

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Create `backend/` as an independent Node.js + Express + TypeScript
server (its own `package.json`, not part of any Next.js project). It will be deployed on
Railway as a persistent server. Set up: a typed Express app, a health endpoint, a
Postgres connection (Neon or Supabase) via a light query client, a Redis connection
(Railway Redis / Upstash), the `log_entries` migration, structured error handling, a
strict JSON body-size limit, and environment-variable loading with validation. No
routes beyond `/health` yet. Follow `docs/architecture.md` §1, §6, §10 exactly. Keep
dependencies minimal (constraint C16)."

**Security**
- Load and **validate** all backend env vars at boot. Distinguish two cases:
  - **Missing / malformed config → fail fast.** If `DATABASE_URL`, `REDIS_URL`,
    `ADMIN_PASSWORD`, `SESSION_SECRET`, or `CORS_ALLOWED_ORIGINS` is absent or fails its
    Zod check, exit non-zero with a clear message. The process must not start.
  - **Config present but a dependency is unreachable at boot → do NOT fail fast.** A
    transient Postgres/Redis connection error on startup should be retried by the
    client, not crash the process, so a brief provider blip during a deploy doesn't
    take the service down. `GET /health` reports the degraded state instead.
- `.gitignore` all `.env*` except `.env.example`.
- Enforce SSL on the Postgres connection string.
- Set a strict global body-size limit (e.g. `express.json({ limit: '16kb' })`; the
  upload route gets its own larger multipart limit later).
- Add baseline hardening middleware: `helmet` (sensible defaults), disable
  `x-powered-by`.
- **`trust proxy` must be pinned to the exact proxy hop count** (Railway = `1`, via
  `TRUST_PROXY_HOPS`), **never `true`**. `trust proxy: true` lets any client spoof
  `X-Forwarded-For`, which makes `req.ip` — and every IP-keyed rate limiter built on it
  (features 2 and 4) — worthless. See `docs/architecture.md` §9.
- No secrets in logs. Configure the logger to redact known secret keys.
- TypeScript `strict` mode on.

**Implementation**
1. `npm init` in `backend/`; add `express`, `typescript`, `ts-node`/`tsx`, `@types/*`,
   a Postgres client (`postgres` or `@neondatabase/serverless`), a Redis client
   (`ioredis` or `redis`), `helmet`, `zod` (env + payload validation), a small logger
   (`pino`).
2. `tsconfig.json` — strict, `outDir dist`, `module` + `target` suitable for Node LTS.
3. `src/config.ts` — parse `process.env` through a Zod schema; export a typed `config`.
   Throw (and exit non-zero) on invalid/missing values. Include `TRUST_PROXY_HOPS`
   (default `1`) and `COOKIE_DOMAIN` (optional; unset locally).
4. `src/lib/db.ts` — a single pooled Postgres client, exported. SSL required.
5. `src/lib/redis.ts` — a single Redis client with reconnect settings and an error
   listener that logs but does not crash the process.
6. `db/001_init.sql`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE TABLE log_entries (
     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     title       text NOT NULL,
     description text NOT NULL,
     date        date NOT NULL,
     image_url   text NOT NULL,
     tags        text[] NOT NULL DEFAULT '{}',
     created_at  timestamptz NOT NULL DEFAULT now()
   );
   CREATE INDEX log_entries_feed_idx ON log_entries (date DESC, created_at DESC);
   ```
   Provide a `npm run migrate` script that applies `db/*.sql` in order.
7. `src/app.ts` — build the Express app: `app.set('trust proxy', config.TRUST_PROXY_HOPS)`,
   `helmet`, JSON body limit, request logging, a `GET /health` returning `{ ok: true }`
   on success or `503` with `{ ok: false, postgres, redis }` when a ping fails, a
   catch-all 404, and a final error-handling middleware that logs the real error and
   returns a generic JSON error.
8. `src/index.ts` — start the server on `config.PORT`. The server listens even if a
   dependency ping is currently failing (health will report it); it only refuses to
   start on invalid config.
9. `backend/.env.example` — every backend variable from `docs/architecture.md` §10,
   empty.
10. `backend/README.md` — how to run locally, how to migrate, pointer to `docs/`.

**Guidelines**
- One responsibility per module: `db.ts` and `redis.ts` only create clients; no queries
  in them.
- All config comes from `src/config.ts` — no direct `process.env` reads elsewhere.
- Errors thrown in handlers propagate to one central error middleware; handlers don't
  each format their own 500.
- Keep the Express app export (`src/app.ts`) separate from the listener (`src/index.ts`)
  so it is testable.

**Quality assurance**
- `npm run build` and `npm run dev` both succeed.
- `GET /health` returns `{ ok: true }` when Postgres and Redis are reachable.
- **Missing/invalid config fails fast:** unset `SESSION_SECRET` (or pass a malformed
  `DATABASE_URL`) → the process exits non-zero at boot with a clear message and never
  binds the port.
- **Unreachable dependency does NOT fail fast:** start with a valid-but-currently-down
  Redis/Postgres → the server still listens and `GET /health` returns `503` with the
  per-dependency status; when the dependency recovers, `/health` goes green with no
  restart.
- `npm run migrate` applies cleanly to a fresh database; re-running is safe or clearly
  errors.
- `req.ip` reflects the real client address behind Railway's proxy, and a spoofed
  `X-Forwarded-For` on a direct request does not override it (trust proxy pinned, not
  `true`).
- No secret appears in stdout logs.
- `curl -I` shows `helmet` headers and no `x-powered-by`.

---

## 2. Backend auth & session endpoints

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Implement single-password admin auth in the backend per
`docs/architecture.md` §5 and §9 and constraints C4b, C5, C13. Endpoints:
`POST /api/admin/login` (rate-limit → validate the shared `ADMIN_PASSWORD` →
create a Redis-backed session → set an `HttpOnly; Secure; SameSite=Lax;
Domain=${COOKIE_DOMAIN}` cookie carrying an opaque signed session ID),
`POST /api/admin/logout` (destroy the session, clear the cookie), and
`GET /api/admin/session` (returns `200` iff the caller has a valid session — the
frontend depends on this in feature 10, so it is NOT optional). Provide a `requireAdmin`
middleware that verifies the signed cookie then the Redis session and fails closed, and
slides the session TTL forward on each successful check. Rate-limit login attempts and
fail closed (`503`) if the limiter store is unavailable. No user table, no roles, no
third-party identity."

**Security**
- **Cookie:** `HttpOnly; Secure; SameSite=Lax; Domain=${COOKIE_DOMAIN}; Path=/;
  Max-Age=<ttl>`. `SameSite=Lax` (not `None`) is correct because the frontend and
  backend share a registrable domain (`ishak.dev` ↔ `api.ishak.dev`), so admin requests
  are same-site — see `docs/architecture.md` §5, §9 and constraint C4b. A cross-site
  `SameSite=None` cookie would be blocked by Safari/ITP and is being removed from
  Chrome. Locally, leave `Domain` unset so it defaults to `localhost`.
- The cookie **value is signed** (or the payload encrypted) with `SESSION_SECRET`; a
  tampered `sid` is rejected *before* any Redis call.
- Constant-time comparison of the submitted password against `ADMIN_PASSWORD`; add a
  small fixed delay on failure.
- **Rate limit runs BEFORE the password compare** (so every attempt is counted), keyed
  by `req.ip`. `req.ip` is only trustworthy if `trust proxy` is set to the exact hop
  count (Railway = `1`) and **never `true`** — verify feature 1 did this, because
  `trust proxy: true` lets a client spoof `X-Forwarded-For` and walk around the limiter.
  On a **successful** login, reset the counter (`DEL ratelimit:login:<ip>`). If the
  limiter's store errors → `503` (fail closed, constraint C13).
- Session ID: cryptographically random, ≥128 bits. Store in Redis as
  `session:<id>` → JSON (`createdAt`, optional UA hash), `EX SESSION_TTL_SECONDS`.
- **Sliding expiration:** on each successful `requireAdmin` check, `EXPIRE session:<id>
  SESSION_TTL_SECONDS` and re-set the cookie `Max-Age`, so an actively-working owner is
  not logged out abruptly at the fixed TTL boundary.
- `requireAdmin` fails closed: any error (missing cookie, bad signature, Redis miss,
  Redis error) → `401`, no partial access. A Redis blip therefore logs the owner out;
  this is expected and matches `docs/architecture.md` §12.
- Never log the password, the session secret, or full session IDs.
- Generic error bodies — do not distinguish "wrong password" from "malformed request"
  in a way that aids probing.

**Implementation**
1. `src/lib/session.ts` — `createSession(res)`, `readSession(req, res)` (takes `res` so
   it can slide the cookie), `destroySession(req, res)`. Handles signing with
   `SESSION_SECRET`, Redis read/write/delete/`EXPIRE`, and cookie set/clear using
   `COOKIE_DOMAIN`. Server-only.
2. `src/lib/rateLimit.ts` — a small Redis-backed limiter. Use an atomic increment that
   cannot leak a permanent key: `SET ratelimit:<scope>:<ip> 0 EX <window> NX` then
   `INCR` (or a single Lua script), **not** `INCR` followed by a separate `EXPIRE`
   (which strands the key forever if the `EXPIRE` call is lost). Exposes
   `limit(scope, key, max, windowSec)` that **throws a 503-mapped error** if Redis is
   unavailable, and `reset(scope, key)`.
3. `src/middleware/requireAdmin.ts` — calls `readSession`; on success attaches
   `req.session`, slides the TTL, calls `next()`; otherwise `res.status(401)`.
4. `src/routes/admin.ts`:
   - `POST /api/admin/login` — validate body `{ password: string }` with Zod;
     `limit('login', req.ip, 5, 900)`; constant-time compare; on match
     `reset('login', req.ip)` then `createSession`; respond `200 { ok: true }`.
   - `POST /api/admin/logout` — `destroySession`; respond `200 { ok: true }`.
   - `GET /api/admin/session` — `requireAdmin` then `200 { ok: true }`. Required by the
     frontend admin area (feature 10) to decide login vs. form on load.
5. Wire `cookie-parser` into the Express app.
6. Add `SESSION_TTL_SECONDS` and `COOKIE_DOMAIN` to config with sane
   defaults/local-friendly handling.

**Guidelines**
- All session mechanics live in `src/lib/session.ts`; routes and middleware call it and
  never touch Redis session keys directly.
- One cookie name (`sid`), defined once in config/consts.
- The limiter is generic and reused by the contact endpoint later — build it once here,
  including the atomic-key pattern above.
- Keep handlers thin; validation via Zod schemas colocated with the route.

**Quality assurance**
- Correct password → `200`, `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax;
  Domain=.<domain>`; a `session:<id>` key exists in Redis with a TTL; the login
  rate-limit counter for that IP is cleared.
- Wrong password → `401` after a visible delay, no cookie, no Redis session key.
- `requireAdmin`-protected test route: works with the cookie, `401` without it, `401`
  with a tampered `sid` (rejected before any Redis call), `401` after the Redis key is
  manually deleted.
- Sliding TTL: make an authed call near the TTL boundary → the Redis key's TTL is
  refreshed and a fresh `Set-Cookie` is returned.
- Logout → Redis key gone, cookie cleared, subsequent protected call `401`.
- `GET /api/admin/session` → `200` with a valid session, `401` without.
- 6 rapid bad logins → `429`; a subsequent **correct** login within the window still
  works only after the window resets (documented behavior), and once it succeeds the
  counter is cleared. Simulate Redis down during login → `503` (not a silent allow).
- Kill the rate-limiter key's `EXPIRE` path in a test → confirm the key still expires
  (atomic pattern), i.e. no permanent lockout.
- With `trust proxy` misconfigured to `true`, a spoofed `X-Forwarded-For` header must
  **not** change the limiter's key — verify feature 1 pinned it to the hop count.
- No password/secret/full session ID in logs.

---

## 3. Backend Log endpoints

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Implement the Log endpoints in the backend per `docs/architecture.md`
§6–§7 and constraints C2, C7, C9. `GET /api/log` (public) returns entries newest first,
optionally served from a short-TTL Redis cache that FAILS OPEN. `POST /api/log` (auth
via `requireAdmin`) validates and inserts one `log_entries` row via a parameterized
query, then deletes the cache key. `POST /api/log/upload` (auth) validates an uploaded
image (MIME allowlist + magic-byte check + hard size limit) and uploads it to blob
storage (Vercel Blob or Cloudinary), returning `{ imageUrl }`. Image bytes never go to
Postgres."

**Security**
- `POST /api/log` and `POST /api/log/upload` are behind `requireAdmin` (fail closed).
- `GET /api/log` is public and read-only; it exposes only the columns needed to render
  the feed.
- Upload validation **before** touching storage:
  - MIME allowlist: `image/jpeg`, `image/png`, `image/webp`;
  - verify magic bytes match the declared type;
  - hard size limit (e.g. 5 MB) enforced by the multipart parser **and** re-checked;
  - server-generates the object key `log/<uuid>.<ext>` — never trust the client
    filename; strip any path.
- `POST /api/log` body validation (Zod): `title`/`description` required + length-capped
  and stored as plain text; `date` a valid ISO date, not far future; `imageUrl` must be
  `https` with a host on the blob-storage allowlist; `tags` an array of short slugs,
  count + length capped.
- Parameterized SQL only.
- Cache read/write failures are swallowed (fail open); a cache **write** failure never
  fails the request.
- Blob storage tokens are backend env only.

**Implementation**
1. `src/lib/storage.ts` — `uploadImage(buffer, ext): Promise<{ url: string }>` wrapping
   the Vercel Blob / Cloudinary SDK. Server-only.
2. `src/lib/uploadValidation.ts` — `validateImage(file): { ok: true, ext } | { ok: false, error }`
   doing MIME + signature + size checks. Pure, unit-testable. Export the allowlist and
   size limit as constants.
3. `src/lib/logRepo.ts` — `listEntries(): Promise<LogEntry[]>` (ordered query using
   `log_entries_feed_idx`) and `createEntry(input: NewLogEntry): Promise<LogEntry>`
   (parameterized `INSERT ... RETURNING`).
4. `src/lib/logCache.ts` — `readCachedList()`, `writeCachedList(entries)`,
   `invalidateList()` against the single key `cache:log:list` with
   `LOG_CACHE_TTL_SECONDS`. Every function try/catches and treats Redis errors as
   "no cache" (fail open).
5. `src/routes/log.ts`:
   - `GET /api/log` — `readCachedList()` → hit returns it; miss/err →
     `listEntries()` → `writeCachedList()` (best effort) → respond `200 { entries }`.
   - `POST /api/log` — `requireAdmin`; Zod-validate; `createEntry`; `invalidateList()`;
     respond `201 { entry }`.
   - `POST /api/log/upload` — `requireAdmin`; `multer` (or `busboy`) with the size
     limit and memory storage; `validateImage`; `uploadImage`; respond
     `200 { imageUrl }`.
6. Add `multer` (or `busboy`) and the blob SDK to dependencies; add
   `LOG_CACHE_TTL_SECONDS` and blob tokens to config + `.env.example`.
7. Shared types in `src/lib/types.ts` (`LogEntry`, `NewLogEntry`).

**Guidelines**
- `logRepo.ts` owns SQL; routes never build queries.
- `logCache.ts` is the only module that touches `cache:log:list`.
- Validation modules are pure; routes wire them up.
- `GET /api/log` response shape is stable and documented in a comment — the frontend
  depends on it.
- Never write image data anywhere except through `src/lib/storage.ts`.

**Quality assurance**
- `POST /api/log/upload` (authed) with a valid JPEG/PNG/WebP under the limit →
  `{ imageUrl }` that loads; a `.txt` renamed `.png` → rejected; an oversized file →
  rejected, nothing uploaded; unauthenticated → `401`.
- `POST /api/log` (authed) with valid data → `201`, one new row; `GET /api/log` then
  shows it first. Unauthenticated → `401`, no row. Bypassing the frontend with `curl`:
  missing fields, 5-year-future date, `imageUrl` on a non-allowlisted host, 50 tags —
  all rejected.
- `GET /api/log` served from cache on the second identical call within the TTL;
  `POST /api/log` invalidates it (next `GET` reflects the new entry immediately).
- Simulate Redis down: `GET /api/log` still returns entries (one DB query per request),
  no error surfaced (fail open).
- Description containing `<script>` is stored verbatim and returned as a plain string
  (escaping is the frontend's job — verify it there in feature 9).
- `EXPLAIN` on the list query uses `log_entries_feed_idx`.

---

## 4. Backend contact endpoint

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Implement `POST /api/contact` in the backend per `docs/architecture.md`
§4 and constraints C9, C13. It re-validates `{ name, email, message, honeypot }`
server-side, drops honeypot hits silently, rate-limits by IP and FAILS CLOSED, and
sends an email via Resend (or similar) with the visitor's address as `replyTo`. Nothing
is written to Postgres, Redis, or blob storage."

**Security**
- Strict body-size limit and Zod validation: `name` ≤ 100, `email` ≤ 200 + format
  check, `message` ≤ 5000, all trimmed and required.
- Honeypot: if the hidden field is non-empty, respond `200 { ok: true }` and send
  nothing.
- Rate limit via the shared `src/lib/rateLimit.ts` (e.g. 5 per 10 min per IP). Limiter
  store unavailable → `503` (fail closed, C13).
- Compose the email body from **escaped** submitted text. Submitted values may set only
  `replyTo`; never `to`, `from`, `subject` structure, or headers.
- Generic responses; log provider errors server-side only.
- Only reachable from allowlisted origins (CORS, feature 11).

**Implementation**
1. `src/lib/email.ts` — `sendContactEmail({ name, email, message })` wrapping the Resend
   SDK, using `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL`. Server-only.
2. `src/routes/contact.ts` — `POST /api/contact`: Zod-validate; honeypot check;
   `limit('contact', ip, 5, 600)`; `sendContactEmail`; respond `200 { ok: true }` or
   `502 { ok: false }` on provider failure.
3. Add `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` to config +
   `.env.example`.
4. Register the route in `src/app.ts`.

**Guidelines**
- The route handler is thin; the provider call lives in `src/lib/email.ts`.
- Reuse the existing rate limiter — do not write a second one.
- One validation schema for the contact payload; the frontend will mirror its rules for
  UX only.
- No database import anywhere in this feature.

**Quality assurance**
- Valid submission → email arrives at `CONTACT_TO_EMAIL` with a working `replyTo`.
- Bypassing client validation with `curl`: empty/invalid/oversized fields → `400`.
- Honeypot filled → `200` but no email sent.
- 6 rapid submissions from one IP → `429`; simulate Redis down → `503` (not a silent
  allow).
- Bad `RESEND_API_KEY` → graceful `502`, error in server logs only, no stack trace to
  the client.
- No rows in Postgres (there are none), no Redis keys beyond the rate-limit counter, no
  blob writes.

---

## 5. Frontend scaffold

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Create `frontend/` as an independent Next.js App Router project in
TypeScript (its own `package.json`; `frontend/app/` is the Next.js root). It is
presentation-only and deploys on Vercel. There are NO API routes — dynamic behavior is
HTTP calls to the backend at `NEXT_PUBLIC_BACKEND_URL`. Set up strict TypeScript,
linting, formatting, a folder structure (`app/`, `components/`, `content/`, `lib/`,
`styles/`), a typed backend-fetch helper module (no calls yet), and env handling. No
pages beyond a blank home. Constraints C3, C6, C16 apply."

**Security**
- `.gitignore` all `.env*` except `.env.example`.
- The only env vars are `NEXT_PUBLIC_BACKEND_URL` and optionally `NEXT_PUBLIC_SITE_URL`
  — both non-secret. Add a comment in `.env.example` stating **no secrets belong here**.
- Strict TypeScript to catch bugs early.
- Add a `lib/backend.ts` helper that centralizes the base URL and `credentials` policy
  so no component hand-rolls a fetch to an arbitrary URL.
- Pin dependency versions; commit the lockfile.

**Implementation**
1. `create-next-app` in `frontend/` — TypeScript, App Router, ESLint. Choose Tailwind
   or plain CSS Modules (see Guidelines) and stay consistent.
2. Folder structure: `app/`, `components/`, `content/`, `lib/`, `styles/`.
3. `tsconfig` path aliases: `@/components`, `@/lib`, `@/content`, `@/content`.
4. Prettier + ESLint (Next config) + `lint` / `format` scripts.
5. `lib/env.ts` — read `NEXT_PUBLIC_BACKEND_URL` (throw at import if missing in a
   non-test env), export a typed object.
6. `lib/backend.ts` — `backendFetch(path, opts)` that prefixes the base URL, sets
   `Content-Type` for JSON, and takes an explicit `auth: boolean` that maps to
   `credentials: 'include' | 'omit'`. No calls yet; just the helper + types.
7. `frontend/.env.example` — `NEXT_PUBLIC_BACKEND_URL=`, `NEXT_PUBLIC_SITE_URL=`, with
   the "no secrets" comment.
8. `frontend/README.md` — run instructions, note that it needs the backend running
   locally for dynamic pages, pointer to `docs/`.
9. Blank `app/page.tsx`; confirm `next build` + `next dev`.

**Guidelines**
- TypeScript everywhere, no `any` without a written reason.
- Prefer Server Components; `"use client"` only where interaction requires it.
- Every backend call goes through `lib/backend.ts` — grep for `fetch(` should find
  nothing else hitting the backend.
- One component per file; named exports; colocated styles.
- Keep dependencies short and defensible (C16).

**Quality assurance**
- `next build` and `next dev` succeed with a blank home page.
- `lint` and `format --check` pass.
- Fresh clone + install + build works with only `NEXT_PUBLIC_BACKEND_URL` set.
- Repo contains no secrets; `.env.example` has the "no secrets" note.
- `lib/backend.ts` compiles and exposes a single typed entrypoint for backend calls.

---

## 6. Frontend design system & app shell

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Build the visual foundation and shared layout for the frontend:
dark-mode-first, clean engineering/documentation aesthetic, one sparingly-used accent
color, sans-serif body + monospace for code/stats/labels, minimal motion (subtle
fade/slide-in only, reduced-motion safe), generous whitespace, sharp edges. Follow the
design direction in `docs/project-definition.md` and constraint C14. Deliver design
tokens, a top nav with the locked 6 items in order, a footer, and shared primitives. No
page content yet."

**Security**
- Add security headers via `next.config` headers or middleware:
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, and a `Content-Security-Policy` that allows `self`, the blob
  storage image host, `NEXT_PUBLIC_BACKEND_URL` in `connect-src`, and the analytics
  host if used. No `unsafe-inline` scripts.
- Self-host fonts via `next/font` — no external font CDN in the CSP.

**Implementation**
1. Design tokens as CSS custom properties (or a Tailwind theme): background layers,
   foreground text tiers, one accent, border color, spacing scale, near-zero radii,
   font families, type scale, motion durations/easing.
2. Two fonts via `next/font`: a sans-serif (body/UI), a monospace (code/stats/labels).
3. `app/layout.tsx` — `<html lang="en">`, dark by default, metadata defaults (title
   template, description, Open Graph, favicon), `connect-src` awareness.
4. `components/Nav` — six links in order: Intro `/`, Built `/built`, How I Got Here
   `/how-i-got-here`, Toolbox `/toolbox`, Log `/log`, Let's Talk `/lets-talk`. Active
   state; responsive collapse on small screens.
5. `components/Footer` — minimal: name, year, GitHub / LinkedIn / email links.
6. Shared primitives: `Container`, `PageHeader`, `Prose`, `Stat`, `Tag`, `MonoLabel`,
   and a `Reveal` wrapper for subtle fade/slide-in that **no-ops under
   `prefers-reduced-motion: reduce`**.
7. `not-found.tsx` and `error.tsx` styled to match.

**Guidelines**
- All color/spacing/type from tokens — no hardcoded hex or magic px in components.
- Accessible: real landmarks, focus-visible styles, AA contrast for body + label text.
- The shell contains no page-specific logic and no backend calls.
- `Reveal` is the only motion primitive; everything animated goes through it.

**Quality assurance**
- All six nav links route to placeholder pages, no 404s.
- Looks intentional and "documentation-like" in dark mode at 375 / 768 / 1280 px.
- AA contrast passes for body and label text.
- Reduced motion enabled → nothing animates.
- Security headers present in the response (`curl -I`); CSP has no `unsafe-inline`
  script.

---

## 7. Frontend static pages (Intro + marquee, Built, How I Got Here, Toolbox)

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Build the four static pages of the frontend — Intro, Built, How I Got
Here, Toolbox — as fully static-generated pages with hardcoded content in
`frontend/content/`. NONE of these pages may fetch the backend or fetch anything at
runtime (constraint C6). Use the content and structure from `docs/project-definition.md`.
The Intro headline is verbatim: 'I build AI systems, then try to break them before
anyone else does.' Built stats must be real and unrounded, weak numbers included
(constraint C11)."

**Security**
- All content hardcoded; no user input on any of these pages.
- Self-host the Intro hero photo and any project images; no external image host for
  static assets.
- Project demo/source links: `rel="noopener noreferrer"`, `target="_blank"`; no
  iframes of the live demos.

**Implementation**

*Intro (`app/page.tsx`)*
1. `content/intro.ts` — headline (verbatim), positioning sub-headline, CTA targets
   (→ `/built`, → `/lets-talk`), ordered marquee list of technologies.
2. Hero: `next/image` photo (priority, explicit dimensions), large headline,
   monospace sub-headline, two CTA links.
3. Marquee: pure-CSS infinite loop (duplicated track, `translateX` keyframes, pause on
   hover); under reduced motion render a static wrapped list. `aria-hidden` on the
   animated track with an accessible plain list for assistive tech.
4. One subtle `Reveal` on the hero on load.
5. Strong metadata / OG image here (primary shared URL).

*Built (`app/built/page.tsx`)*
6. `content/projects.ts` — typed array of exactly two projects: `slug`, `name`, `role`
   (`flagship` first), `hook`, `whatItDoes`, `decisionStory` (title + body), `stats`
   (`{ label, value, note? }[]`), `demoUrl`, `sourceUrl`, optional `stack`.
   - Ai-image-classifier: accuracy `78.2%`, macro F1 `0.78`, per-category breakdown
     including deer `~60%` (weakest); decision story = fail-CLOSED rate limiter (503)
     vs. fail-OPEN prediction cache and/or the accuracy-threshold promotion gate.
   - Research-Agent: decision story = the cyclic grade-and-retry loop with checkpoint
     resume and real numbered clickable citations.
7. `components/ProjectCard` — hook → what it does → decision story (callout treatment)
   → stats (monospace grid) → demo + source links. Flagship first, slightly more
   prominent.

*How I Got Here (`app/how-i-got-here/page.tsx`)*
8. `content/about.ts` (or MDX) — a short first-person narrative with a clear arc
   (~≤ 400 words), optional 2–4 turning points.
9. `PageHeader` + `Prose`; optional single pull-quote.

*Toolbox (`app/toolbox/page.tsx`)*
10. `content/toolbox.ts` — four groups (Frontend, Backend, AI-ML, Infra), each a short
    array (~4–8) of real tools, optional one-clause note.
11. Clean four-section layout; monospace tool names; group headings as mono labels.

12. Ensure all four routes are static: no `fetch`, no `cookies()`, no
    `dynamic = 'force-dynamic'`. Add `sitemap.ts` + `robots.ts` (these pages
    indexable).

**Guidelines**
- Headline and stats are verbatim from the docs — do not paraphrase or round.
- The "one hard technical decision" per project is genuinely one decision, told as a
  narrative (context → tension → choice → result).
- Toolbox lists only tools the author can be quizzed on (C11 spirit); no icons-only
  grid.
- Page components stay Server Components; content lives in `content/`.

**Quality assurance**
- `next build` shows all four pages as static/prerendered; no backend calls in the
  build or at runtime (check the network tab — nothing hits `NEXT_PUBLIC_BACKEND_URL`).
- Intro headline matches the docs character-for-character; marquee loops seamlessly and
  pauses on hover; reduced motion → static marquee, no hero animation; CLS ≈ 0.
- Built: every number matches `docs/project-definition.md`, weak ones included; flagship
  first; both demo + source links resolve.
- How I Got Here reads as a story, not a CV; proofread clean.
- Toolbox: exactly four groups; every tool cross-checks against Built / the real repos.
- Lighthouse performance ≥ 95 on these pages.

---

## 8. Frontend Let's Talk page — wired to the backend contact endpoint

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Build the Let's Talk page in the frontend per `docs/architecture.md`
§4. The page is a static shell (email, GitHub, LinkedIn links) plus a client
`ContactForm` (name, email, message, hidden honeypot). On submit it calls the backend:
`POST {NEXT_PUBLIC_BACKEND_URL}/api/contact` via `lib/backend.ts` with
`credentials: 'omit'`. Client-side validation is for UX only; the backend is the
authority (constraint C9). Depends on backend feature 4 being live."

**Security**
- No secrets; the backend URL is public config.
- Client validation mirrors the backend's contact schema for UX but is never relied on.
- Include the honeypot field (visually hidden, `tabindex=-1`, `autocomplete=off`).
- Handle all backend responses gracefully: `200` → success state; `400` → show a
  generic "check your input"; `429` → "please wait a moment"; `502/503` → "something
  went wrong, email me directly" with the mailto fallback visible.
- Do not echo backend error internals to the user.

**Implementation**
1. `content/contact.ts` — email address, GitHub URL, LinkedIn URL.
2. `app/lets-talk/page.tsx` — static: the three links + `<ContactForm />`.
3. `components/ContactForm` (`"use client"`) — controlled inputs, honeypot, UX
   validation, submit → `backendFetch('/api/contact', { method: 'POST', auth: false, body })`,
   loading / success / error states, disable while submitting, clear on success,
   `aria-live` status region, focus moves to the status message on completion.
4. `lib/schemas.ts` — a shared Zod-ish shape for the contact payload used for client
   hints (kept in sync with the backend schema by convention; note this in a comment).
5. Confirm the page shell itself is static (only the form component is interactive).

**Guidelines**
- The fetch goes through `lib/backend.ts`; no raw `fetch` to the backend URL.
- Accessible form: labels tied to inputs, error text tied to fields.
- Keep the component presentational + a thin submit handler; no business logic.
- Match design tokens; monospace for field labels if that's the established pattern.

**Quality assurance**
- Valid submission → backend receives it → email arrives → success state shown, form
  cleared.
- Invalid fields blocked client-side; when bypassed, the backend `400` renders a clean
  error, not a crash.
- Honeypot filled (via devtools) → success state, no email (backend drops it).
- Backend down / `503` → graceful error with the visible mailto fallback.
- CORS: the request succeeds from `localhost:3000` and from the deployed frontend
  origin; from an unlisted origin it is blocked (verify in feature 11).
- Page shell is static in the build output.

---

## 9. Frontend Log public page — wired to `GET /api/log`

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Build the public `/log` page in the frontend per `docs/architecture.md`
§7. It fetches entries from `GET {NEXT_PUBLIC_BACKEND_URL}/api/log` (no credentials) —
either a Server Component fetch with `cache: 'no-store'` (or a short `revalidate`) or a
client fetch on mount. Render a reverse-chronological feed: image (`next/image`), title,
escaped description, formatted date, tags. NO caching layer in the frontend (constraint
C2) — the backend owns the short-TTL cache. Depends on backend feature 3."

**Security**
- Output-escape all entry text; never `dangerouslySetInnerHTML`. The backend returns
  `<script>`-containing descriptions verbatim — the frontend must render them inert.
- `next/image` with the blob storage host in `images.remotePatterns` and the CSP
  `img-src`.
- No secrets; `GET /api/log` is public, call it with `credentials: 'omit'`.
- Handle backend/DB failure: show a clean error or empty state, never a stack trace.

**Implementation**
1. `lib/log.ts` (frontend) — `fetchLogEntries(): Promise<LogEntry[]>` via
   `backendFetch('/api/log', { auth: false, cache: 'no-store' })`; parse + type the
   response; on non-`200` throw a typed error.
2. `app/log/page.tsx` — Server Component that awaits `fetchLogEntries()` (wrap in an
   error boundary), or a thin client component if you prefer on-mount fetching with a
   loading skeleton.
3. `components/LogFeed` + `components/LogEntryCard` — card layout: image (fixed aspect
   ratio), title, `MonoLabel` formatted date, escaped description, `Tag` list. One
   subtle `Reveal` per card, reduced-motion safe.
4. `lib/format.ts` — stable, locale-fixed date formatting.
5. Empty state ("nothing logged yet") and error state components.
6. `metadata` for `/log`.

**Guidelines**
- The frontend `LogEntry` type matches the backend's `GET /api/log` response shape;
  define it once in `lib/types.ts` and keep it in sync by convention (comment linking
  to the backend).
- No frontend cache/Redis/memoization layer for this data — rely on the backend.
- Card components are presentational; data shaping happens in `lib/log.ts` / the page.
- Consistent image aspect ratio so the feed doesn't jump.

**Quality assurance**
- Entries render newest first, matching backend order.
- Add an entry via the backend (curl or feature 10) → it appears on `/log` on the next
  load (no frontend redeploy).
- Description containing HTML/markup renders as literal text.
- Images load via `next/image` (optimized, sized), no layout shift.
- Empty backend → clean empty state; backend down → clean error state, no crash.
- Network tab shows exactly one call to `{BACKEND_URL}/api/log`, no credentials, no
  other backend calls from this page.
- Lighthouse on `/log` still strong; no console errors.

---

## 10. Frontend admin login + Log entry form — wired to the backend

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Build the frontend admin area per `docs/architecture.md` §5–§6. Route
`/admin/log`: if not authenticated, show a password form that calls
`POST {BACKEND}/api/admin/login` with `credentials: 'include'`; once authenticated,
show the Log entry form (image, title, description, date, tags). Submit flow: `POST
/api/log/upload` (credentials included) to get `{ imageUrl }`, then `POST /api/log`
(credentials included) with the full entry. On mount, call `GET /api/admin/session`
(credentials included) to decide whether to show the login form or the entry form. Also
a logout button calling `/api/admin/logout`. The frontend never sees `ADMIN_PASSWORD` or
the session cookie (it's `HttpOnly`). All admin calls set `credentials: 'include'`; the
cookie is same-site (`ishak.dev` ↔ `api.ishak.dev`) so it flows without `SameSite=None`.
`noindex` on `/admin/*`. Depends on backend features 2 and 3."

**Security**
- Every backend call from the admin area uses `credentials: 'include'` so the `sid`
  cookie is sent; no token is stored in `localStorage` or JS.
- `/admin/*` pages set `robots: noindex, nofollow` and are excluded from
  `sitemap.ts` / `robots.ts`.
- Auth state in the UI is derived from backend responses only: a `GET /api/admin/session`
  check on mount sets the initial state, and a `401` from any later action drops back to
  the password screen. The frontend must **not** try to read the cookie (it's
  `HttpOnly`) or infer auth from anything client-side.
- Client-side validation of the entry form mirrors the backend schema for UX only.
- Image input: accept only image types, show a size hint; the backend does the
  authoritative validation.
- On `401` from any admin action, clear the form's sensitive state and show the login
  screen.

**Implementation**
1. `lib/admin.ts` (frontend) — `login(password)`, `logout()`, `uploadImage(file)`,
   `createEntry(payload)`, each via `backendFetch(path, { auth: true, ... })`. Typed
   returns; `401` mapped to a typed `NotAuthenticatedError`.
2. `app/admin/log/page.tsx` — client component (this whole area is interactive):
   - state: `authState: 'unknown' | 'anon' | 'authed'`;
   - on mount, call `GET /api/admin/session` (`auth: true`) → `200` sets `'authed'`,
     `401` sets `'anon'`;
   - render `<AdminLogin />` or `<LogEntryForm />` accordingly;
   - a logout button.
3. `components/AdminLogin` (`"use client"`) — password field → `login()` → on success
   set `authState='authed'`; on failure show a generic error; handle `429`/`503`.
4. `components/LogEntryForm` (`"use client"`) — file input with preview, title,
   description (textarea), date (defaults to today), tags (comma-separated → array).
   Submit: `uploadImage(file)` → on success `createEntry({ ...fields, imageUrl })` →
   success state, reset form, refresh a small "recent entries" list (fetched from
   `GET /api/log`).
5. Partial-failure handling: if `createEntry` fails after `uploadImage` succeeded, show
   a clear message; an orphaned blob is acceptable, a half-written row is not (the
   backend guarantees this).
6. `app/admin/layout.tsx` — sets `metadata: { robots: { index: false, follow: false } }`.

**Guidelines**
- All admin backend calls go through `lib/admin.ts`; components don't call
  `backendFetch` directly.
- No secret, no token storage; rely entirely on the `HttpOnly` cookie + backend `401`s.
- The admin UI still matches the design tokens — it's internal but not ugly.
- Accessible forms: labelled inputs, `aria-live` status, focus management.

**Quality assurance**
- Correct password → form appears; wrong password → generic error, form stays.
- Full happy path: log in → pick an image → fill fields → submit → success → the entry
  appears in the admin "recent" list and on the public `/log` page.
- Reload the page after login → still authenticated (cookie persists); after logout →
  back to the password screen, and a direct `POST /api/log` from the browser console
  fails `401`.
- Session expiry / manual Redis key delete → next admin action returns `401` → UI drops
  to the login screen, no crash.
- Bypassing the client (curl without the cookie): `POST /api/log` and
  `POST /api/log/upload` → `401`.
- `/admin/log` returns `noindex` and is absent from `/sitemap.xml` / `/robots.txt`.
- Network tab: admin calls include credentials; no token in `localStorage` /
  `sessionStorage`.

---

## 11. CORS hardening between the two services

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Lock down CORS on the backend per `docs/architecture.md` §9 and
constraints C4, C4b. `Access-Control-Allow-Origin` must be an exact-match allowlist from
`CORS_ALLOWED_ORIGINS` (`https://ishak.dev`, `https://www.ishak.dev`,
`http://localhost:3000`), never `*`. `Access-Control-Allow-Credentials: true`. Allowed
methods `GET, POST, OPTIONS`; allowed headers `Content-Type`. Handle preflight. Confirm
`trust proxy` is pinned (not `true`). Decide and document how Vercel preview deployments
are treated — note that `*.vercel.app` previews are cross-site relative to
`api.ishak.dev` and cannot exercise the admin cookie flow, so admin testing needs a
`preview.ishak.dev` alias or a staging backend; a narrow preview-domain regex may still
be added for the non-cookie endpoints — no wildcard."

**Security**
- Reject requests whose `Origin` is not on the allowlist at the CORS layer (no
  `Access-Control-Allow-Origin` header echoed back → browser blocks the response).
- `Allow-Credentials: true` with an explicit origin only — never with `*`.
- Do not reflect an arbitrary `Origin` header back without checking it against the
  allowlist.
- Preflight (`OPTIONS`) responses must not leak a permissive policy.
- Keep the allowlist in env (`CORS_ALLOWED_ORIGINS`), not hardcoded, so prod/staging
  differ without a code change.
- Ensure `helmet` / headers and CORS don't conflict (e.g. `Cross-Origin-Resource-Policy`).
- CORS is a browser control, not the auth boundary — `requireAdmin` (feature 2) plus
  the signed same-site `sid` cookie is what actually protects the write endpoints. CORS
  just stops other web origins from making credentialed calls on the owner's behalf.

**Implementation**
1. `src/middleware/cors.ts` — parse `CORS_ALLOWED_ORIGINS` (comma-separated) into a
   `Set`. Use the `cors` package (or hand-rolled) with an `origin` function that
   callbacks `true` only for exact matches (plus an optional single, narrowly-scoped
   regex for the project's Vercel preview subdomain pattern, if that path is chosen).
2. Configure: `credentials: true`, `methods: ['GET','POST','OPTIONS']`,
   `allowedHeaders: ['Content-Type']`, `maxAge` for preflight caching.
3. Mount CORS **before** the routes; ensure `app.options('*', corsMiddleware)` (or the
   library's automatic preflight handling) is in place.
4. Document the preview-deployment decision in `backend/README.md` and reference it in
   `docs/architecture.md` §9 if the approach is finalized.
5. Add `CORS_ALLOWED_ORIGINS` to `backend/.env.example` with an example value.

**Guidelines**
- One CORS config, mounted once, driven entirely by env.
- No route sets its own CORS headers.
- If the preview-regex path is taken, keep the regex as tight as possible (exact
  project prefix + `.vercel.app` suffix).

**Quality assurance**
- From the allowed dev origin (`localhost:3000`): contact form, login, Log fetch, and
  Log write all succeed (the `sid` cookie flows because it's same-site locally too).
- From the deployed frontend origin (`https://ishak.dev`): same, all succeed, and the
  `sid` cookie is sent on the authed calls to `https://api.ishak.dev`.
- From an unlisted origin (curl `-H "Origin: https://evil.example"` and a scratch
  browser page): the browser blocks the response; the backend does not echo an
  allow-origin header.
- Preflight `OPTIONS` for `POST /api/log` returns the correct, non-wildcard headers.
- `grep` the backend for `"*"` in any CORS context → none.
- Changing `CORS_ALLOWED_ORIGINS` and restarting changes behavior with no code edit.
- `req.ip` in a log line for a real request shows the client IP, not Railway's proxy IP
  (confirms `trust proxy` is set); a hand-crafted `X-Forwarded-For` from an external
  client does not change it.

---

## 12. Deployment of both services & launch hardening

**Read-first statement**
Before starting this feature, read `docs/architecture.md`, `docs/constraints.md`,
`docs/project-definition.md`, and this development plan in full. Do not begin
implementation until all four are read.

**Prompting**
Tell the tool: "Deploy both services under **one shared registrable domain** (constraint
C4b, `docs/architecture.md` §9): frontend on `ishak.dev` (+ `www`), backend on
`api.ishak.dev`. Backend → Railway (persistent server) with its own env vars
(`DATABASE_URL`, `REDIS_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `SESSION_TTL_SECONDS`,
`COOKIE_DOMAIN=.ishak.dev`, `TRUST_PROXY_HOPS=1`, `LOG_CACHE_TTL_SECONDS`,
`RESEND_API_KEY`, blob tokens, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`,
`CORS_ALLOWED_ORIGINS=https://ishak.dev,https://www.ishak.dev`). Frontend → Vercel
(root directory `frontend/`) with `NEXT_PUBLIC_BACKEND_URL=https://api.ishak.dev` and
`NEXT_PUBLIC_SITE_URL=https://ishak.dev`. Provision production Postgres and Redis. Run
the migration against production. Verify the whole system against `docs/constraints.md`.
Set the custom domains first (the cookie flow depends on them), then security headers,
metadata/OG, sitemap/robots, and privacy-friendly analytics if used."

**Security**
- All backend secrets set in Railway's project settings; none in the repo, none in the
  frontend, none `NEXT_PUBLIC_`.
- `ADMIN_PASSWORD` strong and unique; `SESSION_SECRET` a long random value, different
  per environment.
- Production Postgres: SSL enforced, least-privilege credentials.
- Production Redis: password/TLS as the provider supports; not publicly open.
- Blob storage: public-read only on the `log/` prefix, no listing.
- `CORS_ALLOWED_ORIGINS` in production contains only the real frontend origin(s) (+ a
  tight preview rule if chosen) — not `localhost`, not `*`.
- Cookie in production is `HttpOnly; Secure; SameSite=Lax; Domain=.ishak.dev` and only
  ever sent over HTTPS; both services are HTTPS-only and on the shared parent domain
  (constraint C4b). Verify the browser actually stores and re-sends it.
- `TRUST_PROXY_HOPS` is `1` (Railway), not `true`; confirmed by the IP check below.
- `/admin/*` confirmed `noindex` and absent from sitemap/robots in production.
- Confirm security headers (CSP with the real backend + blob hosts, `nosniff`,
  `Referrer-Policy`, `X-Frame-Options`) are live on the frontend.
- Rate limiting verified to fail closed in the real environment.

**Implementation**
1. **Domain first.** Register/confirm `ishak.dev`. Plan the split: `ishak.dev` +
   `www.ishak.dev` → Vercel; `api.ishak.dev` → Railway. Everything below depends on
   this because the session cookie is `Domain=.ishak.dev` (constraint C4b).
2. **Backend on Railway:** create the service from `backend/`, set the start command
   (`node dist/index.js` after `npm run build`), add all env vars including
   `COOKIE_DOMAIN=.ishak.dev`, `TRUST_PROXY_HOPS=1`, and
   `CORS_ALLOWED_ORIGINS=https://ishak.dev,https://www.ishak.dev`. Attach the Railway
   Redis plugin (or set `REDIS_URL` to Upstash), set `DATABASE_URL` to production
   Postgres. Add the `api.ishak.dev` custom domain to the Railway service.
3. Run `npm run migrate` against production Postgres.
4. Confirm `GET /health` on `https://api.ishak.dev` is green (Postgres + Redis
   reachable).
5. **Frontend on Vercel:** create the project with root directory `frontend/`, framework
   preset Next.js, set `NEXT_PUBLIC_BACKEND_URL=https://api.ishak.dev` and
   `NEXT_PUBLIC_SITE_URL=https://ishak.dev` for Production. Add the `ishak.dev` +
   `www.ishak.dev` custom domains to the Vercel project.
6. End-to-end auth check: from `https://ishak.dev/admin/log`, log in → confirm the
   browser stores the `sid` cookie for `.ishak.dev` and re-sends it on the next authed
   call to `https://api.ishak.dev`. If the cookie is dropped, the domain split is wrong
   — do not proceed.
7. Redeploy the backend after the domains resolve so `CORS_ALLOWED_ORIGINS` and the
   cookie domain take effect against the real origins.
8. Final metadata pass on the frontend: per-page titles/descriptions, a real OG image
   (from Intro), favicon, `sitemap.ts`, `robots.ts`.
9. Add Vercel Analytics (or another privacy-friendly option) on the frontend if desired
   (constraint C15).
10. Document every manual setup step in each service's `README.md` so a from-scratch
    redeploy is reproducible.
11. Tag `v1.0.0` on both.

**Guidelines**
- Production config lives in the hosting platforms, not in committed files.
- Clean builds gate both deploys — zero warnings.
- Keep the two services' env var lists in their respective `.env.example` files current.

**Quality assurance**
Run this checklist against the live production URLs:
- All six nav pages load. Intro / Built / How I Got Here / Toolbox are served
  static/CDN and make **zero** calls to the backend (check the network tab).
- A backend outage (temporarily stop the Railway service) leaves the four static pages
  fully working; `/log` and `/lets-talk` degrade gracefully.
- Contact form: a real submission delivers an email with a working reply-to; invalid
  and honeypot submissions behave correctly; rate limiting triggers and fails closed.
- Admin: login with the production password works; wrong password fails; logout works;
  session persists across reloads; the session TTL slides forward on activity;
  `/admin/*` is `noindex` and not in `/sitemap.xml`.
- Admin login works in **Safari** and a Chrome profile with third-party cookies blocked
  — proves the same-site `Domain=.ishak.dev` cookie is not being treated as
  third-party.
- `req.ip` in backend logs shows real client IPs (trust proxy pinned); the login and
  contact rate limits actually throttle per client and return `503` when Redis is down.
- Add a real Log entry with an image in production → it appears on `/log`; the image
  loads optimized; `<script>` in the description renders inert.
- `GET /api/log` is served from the Redis cache on repeat calls within the TTL; adding
  an entry invalidates it immediately.
- Simulate Redis down in production briefly: `/log` still works (fail open); admin login
  fails closed.
- CORS: requests from the real frontend origin succeed; a curl with a foreign `Origin`
  gets no allow-origin header; no `*` anywhere.
- View source / bundle inspection on the frontend: no secret, no `ADMIN_PASSWORD`, no
  `DATABASE_URL`, no `REDIS_URL`, no API keys, no session token in storage.
- Repo-wide grep: no DB/Redis/email/blob client in `frontend/`; no Next.js API routes
  anywhere; Redis in `backend/` used only for `session:*` and `cache:log:list`.
- `curl -I` on the frontend shows the expected security headers; CSP `connect-src`
  includes the backend origin.
- Lighthouse (production): performance, accessibility, best-practices, SEO all strong;
  static pages ≥ 95 performance.
- Every "Live demo" / source link on Built resolves; 404 and error pages are styled.

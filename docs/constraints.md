# Constraints

Hard rules for this project. These are decisions that have already been made. If a
proposed change conflicts with anything here, the change is wrong, not the constraint.
Changing a constraint requires an explicit, deliberate decision by the owner and an
update to all four docs.

This revision **reverses two constraints** from the previous single-app version:
"no separate backend" and "no Redis." Both are now allowed, but tightly scoped — see
C1 and C2.

This revision **reverses two more constraints**, from earlier in this same two-service
architecture: "static pages never fetch the backend at runtime" and "static content is
code, not data." All page content — Intro, Built (including project stats), How I Got
Here, Toolbox, Log, and the Let's Talk contact links — is now database-backed and
owner-editable through a single password-gated admin panel, by deliberate decision, not
scope creep. See C6 and C10 (both now marked superseded) for what changed and why, and
`docs/project-definition.md` / `docs/architecture.md` for the full content model. This
reversal is scoped to **content only** — see the new C17.

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
2. **Optional short-TTL cache of a content area's public GET response** — one key per
   area (`cache:log:list`, `cache:content:<area>`, `cache:projects`, `cache:toolbox`),
   TTL 30–60s, invalidated on write to that area, and it **fails OPEN** (a Redis outage
   must not break a public page). **Unchanged in kind** by the content-admin revision —
   this is the exact same narrow allowance as before (session storage + a small,
   invalidate-on-write, fail-open cache), now applied to every content area instead of
   Log alone. It is still not general-purpose caching — see the forbidden list below.

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
  `api.<domain>`. See `docs/architecture.md` §13.
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
- **Unchanged by the content-admin revision.** The CMS reuses this exact same login —
  one shared password, one session mechanism — for every content area (Intro, Built,
  How I Got Here, Toolbox, Let's Talk links) in addition to Log. It does not introduce
  a second auth system, a per-area login, or any notion of roles.

## C6. ~~Static pages never fetch the backend at runtime~~ — SUPERSEDED

> **Superseded, as of the content-admin revision.** All six pages now fetch their
> content from the backend at request time (ISR-cached) — see `docs/architecture.md`
> §4. This is a **deliberate reversal**, not scope creep: the entire point of this
> revision is that Intro, Built, How I Got Here, Toolbox, and the Let's Talk contact
> links become owner-editable without a code deploy, the same way Log entries already
> were.
>
> **What replaced it:** every page's *content* is data in Postgres, fetched via the
> backend's public GET endpoints (`GET /api/content/:area`, `GET /api/projects`,
> `GET /api/toolbox`, `GET /api/log`).
>
> **What did NOT change:** every page's *layout* — routes, components, CSS, design
> tokens, the six-page navigation — is still static in the frontend codebase and is
> not reachable from the admin panel. See the new **C17**, which locks that down
> explicitly.
>
> *Original rule, for reference:* Intro/Built/How I Got Here/Toolbox were
> static-generated with content hardcoded in `frontend/content/`; only `/log`,
> `/lets-talk`, and `/admin/*` were allowed to call the backend. That restriction no
> longer applies.

## C7. Images are never stored in the database

- Uploaded images live **only** in blob storage (Vercel Blob or Cloudinary).
- Every image column (`log_entries.image_url`, and now `content_blocks.image_url` for
  the Intro hero photo and How I Got Here photo) holds a **URL string** and nothing
  else.
- No base64 blobs, no `bytea` columns, no data URIs persisted to Postgres.
- **Unchanged by the content-admin revision**, and now enforced more broadly: this
  rule already applied to Log images and applies identically to every new image field.
  URL string only, always, no exceptions for the new content areas.

## C8. The locked 6-page structure is unchanged

- The nav is exactly six pages, in this order: **Intro, Built, How I Got Here, Toolbox,
  Log, Let's Talk.** No more, no fewer.
- Any proposed feature, dependency, page, endpoint, or integration must clearly serve
  one of those six pages. If it doesn't, reject it.
- Bias toward deleting. "It would be cool to also…" is a reason to say no. This is a
  sales document, not a platform.
- **Unchanged by the content-admin revision.** The CMS can change what a page *says*;
  it cannot add, remove, or reorder pages, and it cannot rename or reorder the nav.
  See the new **C17** — this is the layout half of the same guarantee.

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

## C10. ~~Static content is code, not data~~ — SUPERSEDED

> **Superseded, as of the content-admin revision.** Intro, Built (including stats), How
> I Got Here, and Toolbox copy is no longer authored in the frontend repo — it lives in
> Postgres and is edited through the admin panel, field by field, including images. The
> exception the Log admin form was always allowed to be (see the original text below)
> is now the rule for every content area, not a one-off.
>
> **What replaced it:** one CMS, behind the one login in C5, covering every content
> area — see `docs/architecture.md` §3 (data model) and §7/§8/§9 (write flows).
>
> **What did NOT change:** this reversal covers **content only**. It does not make
> design or layout editable — see the new **C17**, which is the constraint that keeps
> this reversal from creeping into something it was never meant to be.
>
> *Original rule, for reference:* all copy for Intro/Built/How I Got Here/Toolbox was
> authored in the frontend repo (TSX/MDX/config); the Log admin form was the single
> exception, justified because Log entries are added on an unpredictable schedule
> between deploys. That reasoning now applies to every content area — every content
> area is added/edited on its own schedule by the owner, not on a deploy schedule.

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

## C17. Design and layout are never part of the CMS

- The admin panel edits **content only**: text fields, numbers (including Built
  project stats), and images (as URL strings — see C7). It never edits colors, fonts,
  spacing, component markup, or page structure.
- Nothing in the data model (`docs/architecture.md` §3) describes a color, a font, a
  spacing value, or a layout decision. It has no fields for design, by design.
- Design and layout changes remain frontend code changes: edit `frontend/app`,
  `frontend/components`, or `frontend/app/globals.css`, and redeploy.
- This is the boundary that makes the C6/C10 reversal (all content is now
  database-backed) safe: content became editable at runtime; design and layout did
  not, and never will through this panel.
- Any future request to make design editable through the CMS — "let's let the owner
  pick the accent color from the admin panel," "let's add a theme picker," "let's make
  the hero layout configurable," "let's let the owner add a new page" — is scope creep
  and gets **rejected**, the same way past requests to blur the frontend/backend line
  were rejected (C1, C3).

## C18. Editing a Built project stat requires confirm-before-save

- Protects **C11** (all stats and claims on the Built page must be real and
  verifiable) now that stats are editable at runtime instead of fixed in code and
  gated by a code review before a deploy.
- **Two layers, not one — both required, neither is a substitute for the other:**
  1. **UI layer:** before submitting, the admin UI must show the **old value and the
     new value side by side** and require an **explicit confirm** action. No
     save-on-blur, no auto-save, no "the owner can undo it later" as a substitute for
     confirming first.
  2. **Backend layer (optimistic concurrency check):** the write request
     (`PUT`/`POST` to a project's stats) must include the value the UI displayed and
     the owner confirmed as current — e.g. `{ previousValue, newValue, ... }` —
     alongside the new field values. The backend **rejects the write with `409
     Conflict`** if the submitted `previousValue` does not **exactly** match the
     value currently stored in `project_stats` for that row. The write proceeds only
     on a match.
- The backend check does **not** judge whether `newValue` is factually correct — it
  still cannot tell a corrected typo from an inflated number, and that judgment
  remains the owner's. What it enforces is narrower and mechanical: the confirmation
  the owner acted on must have been grounded in the value actually stored at write
  time, not a stale UI state or a value invented by a request that skipped the
  confirm dialog entirely.
- This closes a real gap the UI layer alone leaves open: a direct API call that
  bypasses the confirmation dialog is not stopped by client-side UX. The backend
  concurrency check is what actually prevents an unconfirmed overwrite — the UI layer
  and the backend layer are both required together.
- Applies to every write path that touches a project's stats: editing an existing stat
  and adding a new one (`PUT` / `POST /api/projects/:id/stats...` —
  `docs/architecture.md` §8, §11). A project's non-stat fields (hook, whatItDoes,
  decision, stack, demo/source links) do **not** require this step — only stats,
  because only stats carry a factual, verifiable claim.

---

## Quick reject list

Say **no** immediately to any of these unless the owner explicitly reverses the
constraint:

- "Let's add Next.js API routes to the frontend for convenience." (C1)
- ~~"Let's cache the projects/toolbox data in Redis too."~~ — **retired as a
  rejection.** C2 now explicitly allows this: a short-TTL, invalidate-on-write,
  fail-open cache per content area, including `cache:projects` and `cache:toolbox`.
  What's still rejected under C2: caching it *without* those three properties (no
  invalidation on write, no TTL, or failing closed on a Redis error), or caching
  anything that isn't a content-area public GET response.
- "Let's use Redis for rate limiting and just fail open if it's down." (C2, C13)
- "Let's add a Redis client to the frontend." (C2, C3)
- "Let's put the DB client in the frontend so the Log page is faster." (C3)
- "Let's set CORS to `*` so preview deployments work." (C4)
- "Let's set `trust proxy` to `true` so it just works on any host." (C4)
- "Let's just deploy the backend on `*.up.railway.app` and use a `SameSite=None`
  cookie." (C4b)
- "Let's add user accounts / login with GitHub / a second admin." (C5)
- ~~"Let's fetch the Built stats from the backend so they're easier to edit." (C6,
  C10)~~ — **retired.** This was rejected under the previous, now-superseded version
  of C6/C10. It is exactly what the content-admin revision deliberately did — see C6,
  C10 (superseded) and the new C17/C18 for the guardrails that came with it.
- "Let's store the images in Postgres so there's one less service." (C7)
- "Let's add a blog / projects archive / testimonials / now page." (C8)
- "Let's skip backend validation since the frontend already validates." (C9)
- "Let's put the backend URL config somewhere and also stash the API key next to it." (C12)
- "Let's let the owner change the accent color / fonts / page layout from the admin
  panel." (C17)
- "Let's skip the confirm dialog for stat edits — it's just one field." (C18, C11)

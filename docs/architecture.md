# Architecture

This document describes the two-service architecture: an independent **frontend**
(Next.js on Vercel) and an independent **backend** (Node.js + Express + TypeScript on
Railway), connected only by the frontend calling the backend's public REST API over
HTTPS.

`docs/constraints.md` lists the hard rules this architecture must never break.
`docs/project-definition.md` explains why the system is split this way.

---

## 1. Repository layout

```
your-portfolio/
  frontend/                 independent Next.js project
    package.json
    app/                    Next.js App Router root (valid: app/ is at THIS
                            project's root, and frontend/ has its own package.json)
    components/
    content/                hardcoded static page content (TS/TSX)
    lib/                    fetch helpers that call the backend API
  backend/                  independent Node + Express + TypeScript server
    package.json
    src/
      index.ts              server entrypoint
      routes/               contact, admin, log
      lib/                  db, redis, session, email, storage, validation
      middleware/           auth guard, CORS, error handler, body limits
    db/                     migrations
  docs/
    project-definition.md
    architecture.md
    constraints.md
    development-plan.md
```

There are **no Next.js API routes** anywhere in this architecture. All dynamic behavior
is an HTTP call from the frontend to the backend.

---

## 2. System overview

```
                    ┌───────────────────────────────────────────────┐
                    │                   Vercel                       │
   Visitor /        │   frontend/  — Next.js (App Router)            │
   Owner ──────────▶│                                               │
   (browser)        │   Static (SSG), served from Vercel CDN:        │
                    │     /            Intro                         │
                    │     /built       Built                        │
                    │     /how-i-got-here                            │
                    │     /toolbox     Toolbox                       │
                    │     /lets-talk   Let's Talk (page shell)       │
                    │                                               │
                    │   Client-fetches the backend at runtime:      │
                    │     /log         public Log feed              │
                    │     /admin/log   owner admin form             │
                    └───────────────┬───────────────────────────────┘
                                    │
                                    │  HTTPS  (CORS: only the known
                                    │          frontend origin(s),
                                    │          credentials allowed)
                                    ▼
                    ┌───────────────────────────────────────────────┐
                    │                  Railway                       │
                    │   backend/  — Node.js + Express + TypeScript   │
                    │   Persistent server. Owns ALL logic + secrets.│
                    │                                               │
                    │   REST API:                                   │
                    │     POST /api/contact                         │
                    │     POST /api/admin/login                     │
                    │     GET  /api/log            (public)         │
                    │     POST /api/log            (auth)           │
                    │     POST /api/log/upload     (auth)           │
                    └───┬───────────────┬───────────────┬───────────┘
                        │               │               │
          ┌─────────────┘   ┌───────────┘      ┌─────────┘         ┌───────────────┐
          ▼                 ▼                  ▼                   ▼
  ┌───────────────┐ ┌───────────────┐ ┌────────────────────┐ ┌──────────────────┐
  │ Postgres      │ │ Redis         │ │ Blob image storage │ │ Email provider   │
  │ (Neon /       │ │ (Railway      │ │ (Vercel Blob /     │ │ (Resend or sim.) │
  │  Supabase)    │ │  Redis plugin │ │  Cloudinary)       │ │                  │
  │               │ │  or Upstash)  │ │                    │ │ sends contact    │
  │ log_entries   │ │ - sessions    │ │ stores image files,│ │ form emails      │
  │ (text + URL)  │ │ - short-TTL   │ │ returns public URL │ │                  │
  │               │ │   Log cache   │ │                    │ │                  │
  └───────────────┘ └───────────────┘ └────────────────────┘ └──────────────────┘
        ▲ backend only    ▲ backend only     ▲ backend only        ▲ backend only
```

### Components and responsibilities

| Component | Technology | Responsibility |
| --- | --- | --- |
| **Frontend** | Next.js App Router (TS) on Vercel | Presentation only. Renders all 6 pages; SSG for the 4 static pages; client-side `fetch` to the backend for Log read, admin login, and Log write; contact form POSTs to the backend. **No DB client, no secrets, no auth logic, no email logic.** |
| **Backend** | Node.js + Express + TypeScript on Railway | All business logic, all data access, all secrets. Exposes the REST API. Talks to Postgres, Redis, blob storage, and the email provider. Enforces auth and CORS. |
| **Postgres** | Neon or Supabase | Stores **Log entries only**: `id`, `title`, `description`, `date`, `image_url`, `tags`, `created_at`. Accessed only by the backend. |
| **Redis** | Railway Redis plugin (or Upstash) | (1) Admin **session storage**. (2) Optional **short-TTL cache** (30–60s) of the `GET /api/log` response. Nothing else. Accessed only by the backend. |
| **Blob storage** | Vercel Blob or Cloudinary | Stores uploaded Log images. The DB only ever holds the returned URL string. Written only by the backend's upload endpoint. |
| **Email provider** | Resend or similar | Delivers contact-form messages to the owner's inbox. Called only by the backend's contact endpoint. No DB. |

### What is static vs. dynamic, and why

| Route (frontend) | Mode | Why |
| --- | --- | --- |
| `/` (Intro) | **Static (SSG)** | Hardcoded copy + a CSS marquee. No per-request data. This is the page that must "stop the scroll" — it should be instant. |
| `/built` (Built) | **Static (SSG)** | Project write-ups and stats are hardcoded in `frontend/content/`. They change only on a code edit + redeploy. |
| `/how-i-got-here` | **Static (SSG)** | Hardcoded prose. |
| `/toolbox` (Toolbox) | **Static (SSG)** | Hardcoded grouped list. |
| `/lets-talk` (Let's Talk) | **Static (SSG)** shell; the form POSTs to the backend at runtime | Page markup + links + a form. Only the submission is dynamic, and it is a cross-service HTTP call. |
| `/log` (public feed) | **Dynamic** — client component fetches `GET /api/log` on load (or a Server Component fetch with `cache: 'no-store'` / short `revalidate`) | It reflects backend data that the owner adds between deploys. It must show new entries with no frontend redeploy. |
| `/admin/log` (admin form) | **Dynamic** — client-side, auth-gated, `noindex` | Behind auth; must never be statically captured or indexed. |

**Rule of thumb:** if content changes only when the author edits the frontend codebase,
it is static. The only content that changes without a deploy is Log entries, which live
in the backend — so the Log page is the only dynamic surface on the frontend.

---

## 3. Data flow: visitor viewing a static page

Applies to Intro, Built, How I Got Here, Toolbox, and the Let's Talk page shell.

```
1. Browser requests e.g. GET https://<frontend>/built
2. Vercel CDN serves the pre-rendered HTML + CSS + JS for that page
   (generated once at build time, cached at the edge).
3. The backend is NOT called. Postgres, Redis, blob storage, and the email
   provider are NOT touched.
4. Browser hydrates. Any motion (fade/slide-in, marquee) is client-side CSS/JS
   driven by no external data.
```

- **Latency path:** browser → Vercel edge → done.
- **Failure modes:** effectively only "Vercel/CDN is down." A backend outage has **zero
  effect** on these pages.
- **Why:** these pages are the core of the pitch and the performance story. They must
  be instant and have no moving parts.

---

## 4. Data flow: visitor submitting the contact form

```
1. Visitor is on /lets-talk (static page). Fills in name, email, message.
2. Client-side validation runs for UX (required fields, email format, max
   lengths, honeypot field must be empty).
3. Browser sends:
       POST https://<backend>/api/contact
       Content-Type: application/json
       body: { name, email, message, honeypot }
   (credentials: 'omit' — no auth needed for contact)
4. Backend CORS middleware checks the Origin against the allowed list.
   Not allowed → request is rejected by CORS.
5. Backend /api/contact handler:
     a. Enforces a strict body-size limit and re-validates every field
        server-side (never trusts the client).
     b. Checks the honeypot field is empty; if not → respond 200 and drop
        silently (bot).
     c. Applies a rate limit that FAILS CLOSED (if the limiter's backing store
        errors, reject with 503 — never silently allow). Keyed by IP.
     d. Calls the email provider SDK (Resend):
            to:      CONTACT_TO_EMAIL
            from:    CONTACT_FROM_EMAIL (verified sender)
            replyTo: the visitor's submitted email
            subject: "Portfolio contact — <name>"
            body:    the message + submitted metadata (as escaped text)
     e. Success → 200 { ok: true }.  Provider error → 502 { ok: false },
        error logged server-side only.
6. Postgres, Redis, and blob storage are NOT touched.
7. Browser shows a success or error state based on the response.
```

```
[Browser] ──POST /api/contact──▶ [Backend] ──SDK──▶ [Email provider] ──▶ owner inbox
                                     │
                                     └── no DB, no Redis, no blob storage
```

- **Why no database:** delivering a message is an email problem, not a storage problem.
  Adding a table would violate "reject any addition that doesn't clearly serve a page."
- **Secrets involved (backend only):** `RESEND_API_KEY`, `CONTACT_TO_EMAIL`,
  `CONTACT_FROM_EMAIL`.

---

## 5. Data flow: owner logging in

> **Deployment prerequisite — the two services share one registrable domain.**
> The frontend is served from the apex/`www` (e.g. `ishak.dev`) and the backend from a
> subdomain of the same domain (e.g. `api.ishak.dev`). This is required so the session
> cookie works — see the "Session cookie" note below and §9. On the default platform
> hostnames (`*.vercel.app` + `*.up.railway.app`) the cookie approach does **not**
> work; custom domains on a shared parent are part of the design, not an optional
> polish step.

```
1. Owner opens /admin/log on the frontend. No valid session cookie present
   → the page shows a password prompt.
2. Owner submits the shared password:
       POST https://api.<domain>/api/admin/login
       Content-Type: application/json
       credentials: 'include'          <-- so the Set-Cookie sticks
       body: { password }
3. Backend CORS middleware validates the Origin AND runs with
   credentials: true + an explicit allowed origin (never "*", which is
   incompatible with credentials).
4. Backend /api/admin/login handler:
     a. Strict body-size limit; validate the payload shape.
     b. Rate limit BEFORE the compare, keyed by client IP (see §9 / trust proxy).
        Limiter store unavailable → 503 (FAIL CLOSED, constraint C13).
     c. Constant-time compare the password against ADMIN_PASSWORD.
        Mismatch → small artificial delay, then 401 (generic message).
     d. Match → create a session:
          - generate a random session ID (>=128 bits)
          - store session data in Redis:  SET session:<id> {createdAt,...}
            EX <session TTL, e.g. 7 days>
          - reset the login rate-limit counter for this IP (DEL ratelimit:login:<ip>)
          - set the session ID on the response as a cookie:
              Set-Cookie: sid=<signed id>;
                HttpOnly; Secure; SameSite=Lax; Domain=.<domain>; Path=/;
                Max-Age=<TTL>
     e. Respond 200 { ok: true }.
5. The browser stores the HttpOnly cookie. The frontend JS never reads it and
   never sees ADMIN_PASSWORD or SESSION_SECRET.
6. Subsequent authed calls from the frontend use credentials: 'include' so the
   sid cookie rides along. The backend's auth middleware:
       - verifies the cookie signature (SESSION_SECRET); bad signature → 401
       - GET session:<id> from Redis
       - missing/expired → 401 (fail closed)
       - Redis error → 401 (fail closed; a Redis blip logs the owner out — expected,
         see §12)
       - present → refresh the TTL (EXPIRE session:<id> <TTL>, and re-set the cookie
         Max-Age) so an actively-working session slides forward instead of expiring
         abruptly at the 7-day mark
       - attach the session to req and continue
7. Logout: POST /api/admin/logout → backend DEL session:<id> in Redis and
   clears the cookie.
```

```
[Browser] ──POST /api/admin/login (password, credentials:'include')──▶ [Backend]
                                                                          │
                                          rate limit (fail closed) + constant-time
                                          compare ADMIN_PASSWORD
                                                                          │
                                          SET session:<id> EX <ttl> ──▶ [Redis]
                                                                          │
[Browser] ◀── Set-Cookie: sid=<id>; HttpOnly; Secure; SameSite=Lax; Domain=.<domain> ┘
```

> **Session token approach — decided:** an **HttpOnly, Secure, `SameSite=Lax` cookie
> with `Domain=.<shared-domain>`**, carrying an opaque signed session ID, with the
> session record in Redis. Not a bearer token in JS-readable storage.
>
> - **Why `SameSite=Lax` and not `None`:** `SameSite` is evaluated on the registrable
>   domain (eTLD+1), not the host. With the frontend on `<domain>` and the backend on
>   `api.<domain>`, admin requests are **same-site**, so `Lax` is sufficient and the
>   cookie is not a third-party cookie. A `SameSite=None` cross-site cookie would be
>   blocked outright by Safari/ITP and is being phased out in Chrome — it would break
>   admin login on the author's own devices. `Lax` also closes the logout-CSRF hole
>   that `None` opens.
> - **Why HttpOnly + Redis:** HttpOnly keeps the credential out of reach of any XSS on
>   the frontend; Redis makes the session revocable (logout / TTL / manual eviction)
>   and is a natural fit for a persistent server.
> - **`SESSION_SECRET`** signs/verifies the cookie value (and/or encrypts the payload)
>   so a tampered `sid` is rejected before the Redis lookup.
> - **Fallback if a shared parent domain is ever unavailable:** switch admin-only auth
>   to a bearer token returned from `/api/admin/login` and held in frontend JS memory
>   (never `localStorage`), sent as `Authorization: Bearer`. This loses the HttpOnly
>   protection, so it is the fallback, not the default.

---

## 6. Data flow: owner adding a Log entry

Three stages: authenticate (see §5), upload image, write row. All calls use
`credentials: 'include'` so the `sid` cookie is sent; the backend auth middleware
guards every one.

### 6a. Upload image → blob storage

```
1. Owner picks an image and fills in title, description, date, tags on the
   /admin/log form.
2. Browser sends:
       POST https://<backend>/api/log/upload
       (multipart/form-data, the file)   credentials: 'include'
3. Backend /api/log/upload handler:
     a. Auth middleware: valid sid session in Redis, else 401. Stop.
     b. Validate the file:
          - MIME allowlist: image/jpeg, image/png, image/webp
          - magic-byte / signature check (not just the declared MIME)
          - hard size limit (e.g. 5 MB) — reject larger, do not truncate
          - optional max dimensions
     c. Upload to blob storage under a namespaced, server-generated path:
          log/<uuid>.<ext>   with public read
     d. Respond 200 { imageUrl }  — the public URL string.
4. The image file now lives ONLY in blob storage. It is never written to
   Postgres and never base64'd anywhere.
```

### 6b. Write the row

```
1. Browser sends:
       POST https://<backend>/api/log
       Content-Type: application/json     credentials: 'include'
       body: { title, description, date, imageUrl, tags }
2. Backend /api/log handler:
     a. Auth middleware: valid sid session, else 401. Stop.
     b. Validate + sanitize every field (shared schema):
          - title:       required, trimmed, max length
          - description: required, trimmed, max length, stored as PLAIN TEXT
                         (rendered escaped by the frontend, never as raw HTML)
          - date:        valid ISO date, not absurdly in the future
          - imageUrl:    required, https, host must be on the blob-storage
                         allowlist
          - tags:        array of short slug strings, capped count + length
     c. INSERT one row into log_entries via a parameterized query.
     d. Invalidate the Log cache in Redis:  DEL cache:log:list
     e. Respond 201 { entry }.
3. Owner sees a success state and the new entry in the admin preview list.
```

### Full picture

```
[Owner browser]
   │ 1. POST /api/admin/login (password)         ──▶ [Backend] ──SET──▶ [Redis session]
   │    ◀── Set-Cookie: sid=... (HttpOnly)
   │
   │ 2. POST /api/log/upload (file, sid cookie)  ──▶ [Backend] ──auth✓──▶ validate
   │                                                     └──upload──▶ [Blob storage]
   │    ◀── { imageUrl }
   │
   │ 3. POST /api/log ({..., imageUrl}, sid)     ──▶ [Backend] ──auth✓──▶ validate
   │                                                     ├──INSERT──▶ [Postgres]
   │                                                     └──DEL cache:log:list──▶ [Redis]
   │    ◀── 201 { entry }
   ▼
 next GET /api/log rebuilds the cache from Postgres and serves the new entry
```

- **Postgres stores:** `id`, `title`, `description`, `date`, `image_url`, `tags`,
  `created_at`. That's all.
- **Postgres never stores:** image bytes, any credential, any visitor data.

---

## 7. Data flow: visitor viewing the Log page

```
1. Browser loads /log on the frontend.
2. The frontend requests entries from the backend:
       GET https://<backend>/api/log        (no credentials — public)
   Either from a client component on mount, or from a Server Component fetch
   with cache: 'no-store' (or a short revalidate). No Next.js API route is
   involved.
3. Backend /api/log handler:
     a. Try Redis:  GET cache:log:list
          - hit  → return the cached JSON immediately
          - miss OR Redis error → continue (cache read FAILS OPEN: a cache
            outage must not break the public Log page)
     b. Query Postgres:
          SELECT id, title, description, date, image_url, tags
          FROM log_entries
          ORDER BY date DESC, created_at DESC
     c. On a cache miss, best-effort write back:
          SET cache:log:list <json> EX <30-60s>
        (a failed cache write is swallowed — fail open)
     d. Respond 200 { entries: [...] }
4. The frontend renders the feed: each entry shows
   <img src={image_url}> (loaded by the browser directly from blob storage,
   optionally via next/image), title, escaped description, formatted date, tags.
5. Postgres is the source of truth; Redis only shortcuts repeated identical
   reads within the TTL window.
```

```
[Browser] ──GET /api/log──▶ [Backend] ──GET cache:log:list──▶ [Redis]
                                │  (miss / error → fail open)
                                └──SELECT──▶ [Postgres] ──▶ SET cache (EX 30-60s) ──▶ [Redis]
   entry.image_url ──▶ browser loads <img> directly from [Blob storage]
```

- **Cache semantics:** the Log-list cache **fails OPEN** — if Redis is down, the page
  still works, just with one DB query per request. This is safe because it is read-only
  public data. (Contrast: the login rate limiter **fails CLOSED**.)
- **Invalidation:** `POST /api/log` deletes `cache:log:list`, so a new entry is visible
  on the next request regardless of TTL.

---

## 8. Why Redis now, and why it was rejected before

| | Previous architecture (single Next.js app, serverless API routes) | Current architecture (persistent Express backend) |
| --- | --- | --- |
| **Runtime model** | Each API request ran in a short-lived, stateless serverless function. Nothing persisted between requests in-process. | One long-lived Node process (or a small pool) with stable memory, a connection pool, and a Redis client held open. |
| **Sessions** | No persistent server to hold a session store; a signed stateless cookie was the only sane option, and Redis would have been infra with no home. | A real, revocable server-side session store is now both possible and standard. Session IDs live in Redis; logout and TTL actually evict them. |
| **Caching** | Serverless functions had no shared in-process cache; Vercel's CDN + Next.js static generation already covered performance. Adding Redis bought nothing. | A persistent server serving `GET /api/log` under load benefits from a tiny shared cache so repeated identical reads don't each hit Postgres. |
| **Verdict** | Redis correctly rejected — no session to store, nothing to cache. | Redis correctly included — real session storage need + a genuine repeated-read to cache. |

**Scope of Redis in this project (hard limit — see `docs/constraints.md`):**

- ✅ Admin **session storage** (`session:<id>` keys, TTL-bound, deleted on logout).
- ✅ **Optional short-TTL cache** of the `GET /api/log` response (`cache:log:list`,
  30–60s, invalidated on write, **fails open**).
- ❌ NOT general-purpose caching of other endpoints or queries.
- ❌ NOT rate limiting that fails open silently. Any rate limiting **fails closed**
  (503) — matching the Ai-image-classifier project's philosophy.
- ❌ NOT used in the frontend at all — the frontend has no server-side logic to cache.

---

## 9. CORS and the shared parent domain

### Domain layout (decided)

Both services run under **one registrable domain**:

| Service | Host (example) | Platform |
| --- | --- | --- |
| Frontend | `ishak.dev` (and `www.ishak.dev`) | Vercel |
| Backend | `api.ishak.dev` | Railway |

This is a hard requirement of the session design (§5): because `SameSite` is judged on
the registrable domain, `ishak.dev` ↔ `api.ishak.dev` requests are **same-site**, so the
`sid` cookie is `SameSite=Lax` with `Domain=.ishak.dev` and is never a third-party
cookie. The default platform hostnames (`*.vercel.app`, `*.up.railway.app`) are
different registrable domains and will not work for the cookie — custom domains are
part of the architecture, not a finishing touch.

### CORS rules

- The backend sets CORS explicitly: `Access-Control-Allow-Origin` is an **exact match**
  against an allowlist (`CORS_ALLOWED_ORIGINS`), never `*`.
- Allowlist contents:
  - the production frontend origin(s): `https://ishak.dev`, `https://www.ishak.dev`,
  - `http://localhost:3000` during development.
- `Access-Control-Allow-Credentials: true` (required for the `sid` cookie). This is
  **incompatible with `*`**, which is another reason the allowlist must be explicit.
- Allowed methods: `GET, POST, OPTIONS`. Allowed headers: `Content-Type`. Preflight
  (`OPTIONS`) handled for the POST endpoints; preflight response cached 10 minutes.
- A disallowed `Origin` gets **no** `Access-Control-Allow-Origin` header. The request
  is not rejected server-side — the browser blocks the response. Requests with **no**
  `Origin` header (curl, server-to-server, same-origin navigations) pass the CORS layer
  and are still gated by `requireAdmin` where it matters. CORS is a browser control,
  not the auth boundary.
- The check is one pure predicate (`backend/src/lib/originAllowlist.ts`), unit-tested,
  used by the single `cors` middleware. No route sets its own CORS headers.

**Vercel preview deployments — decided.** The four static pages need no backend. `/log`
and `/lets-talk` call the public endpoints, which a `*.vercel.app` preview origin
cannot reach under the exact allowlist. The backend therefore accepts an optional
**`CORS_PREVIEW_ORIGIN_REGEX`** — a tight, anchored pattern (e.g.
`^https://portfolio-[a-z0-9-]+\.vercel\.app$`); a matching `Origin` is allowed through
CORS so those **public** endpoints work on preview URLs. It is **never** `*`, and it
does **not** enable the admin cookie flow on a preview (the `sid` cookie is still
cross-site there). For admin QA on a preview, alias it to `preview.<domain>` or run a
staging backend. In the simplest setup the regex is left unset.

### `trust proxy` (affects rate-limit correctness)

- `req.ip` feeds the IP-keyed login/contact rate limiters, so it must not be spoofable.
- `TRUST_PROXY_HOPS` defaults to **`0`** — trust nothing, `X-Forwarded-For` ignored,
  `req.ip` is the socket address. Correct for local dev and unspoofable.
- **Railway terminates at exactly one proxy**, so set `TRUST_PROXY_HOPS=1` there:
  `app.set('trust proxy', 1)` trusts only the single hop Railway adds (the real client
  IP), so a client sending its own `X-Forwarded-For` can't override it.
- **Never** a value that makes Express `trust proxy` fully permissive — every entry
  becomes client-controlled and the limiters are worthless.

---

## 10. Environment variables

### Frontend env vars (minimal — no secrets)

| Variable | Purpose | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Base URL of the backend API, e.g. `https://api.ishak.dev` | Public by design; it's just a URL. Used by the frontend fetch helpers. Must be a subdomain of the frontend's own domain (see §9). |
| `NEXT_PUBLIC_SITE_URL` *(optional)* | The frontend's own canonical URL, e.g. `https://ishak.dev`, for metadata / OG / sitemap | Public. |

That is the whole list. The frontend holds **no** database URL, **no** API keys, **no**
`ADMIN_PASSWORD`, **no** `SESSION_SECRET`.

### Backend env vars (all secret / server-only)

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Postgres client | Connection string (SSL enforced) |
| `REDIS_URL` | Redis client | Connection string for sessions + Log cache |
| `ADMIN_PASSWORD` | `/api/admin/login` | The single shared admin password |
| `SESSION_SECRET` | session middleware | Signs/encrypts the session cookie value |
| `SESSION_TTL_SECONDS` *(optional)* | session middleware | Session lifetime, TTL slid forward on each authed request (default e.g. 7 days) |
| `COOKIE_DOMAIN` | session middleware | The shared parent domain for the `sid` cookie, e.g. `.ishak.dev` (leave unset locally so it defaults to `localhost`) |
| `LOG_CACHE_TTL_SECONDS` *(optional)* | `/api/log` | Log-list cache TTL (default 45) |
| `RESEND_API_KEY` | `/api/contact` | Email provider auth |
| `CONTACT_TO_EMAIL` | `/api/contact` | Where contact messages are delivered |
| `CONTACT_FROM_EMAIL` | `/api/contact` | Verified sender address |
| `BLOB_READ_WRITE_TOKEN` *(or `CLOUDINARY_*`)* | `/api/log/upload` | Blob storage auth |
| `CORS_ALLOWED_ORIGINS` | CORS middleware | Comma-separated exact origins (`https://ishak.dev,https://www.ishak.dev,http://localhost:3000`) |
| `CORS_PREVIEW_ORIGIN_REGEX` *(optional)* | CORS middleware | Anchored regex; a matching Origin is allowed through CORS for the public endpoints only (Vercel previews). Never `*`. |
| `TRUST_PROXY_HOPS` *(optional)* | server bootstrap | Proxy hops to trust for `req.ip`. Default `0` (local). **Railway: `1`.** Never fully permissive. |
| `PORT` | server bootstrap | Provided by Railway |

`.env` files on both sides are gitignored; each service ships a committed
`.env.example` listing its own variables with empty values.

---

## 11. Summary: dependencies per user action

| Action | Frontend render | Backend endpoint | Postgres | Redis | Blob storage | Email |
| --- | :--: | :--: | :--: | :--: | :--: | :--: |
| View Intro / Built / How I Got Here / Toolbox | static (CDN) | — | — | — | — | — |
| View Let's Talk page shell | static (CDN) | — | — | — | — | — |
| Submit contact form | static page + fetch | `POST /api/contact` | — | — | — | ✅ |
| Owner logs in | dynamic | `POST /api/admin/login` | — | ✅ write session | — | — |
| Authed request (any) | dynamic | auth middleware | — | ✅ read session | — | — |
| Owner uploads Log image | dynamic | `POST /api/log/upload` | — | ✅ read session | ✅ | — |
| Owner writes Log entry | dynamic | `POST /api/log` | ✅ INSERT | ✅ read session + `DEL cache:log:list` | — | — |
| View Log page | dynamic | `GET /api/log` | ✅ SELECT on cache miss | ✅ read/write cache (fail open) | ✅ image `src` | — |

---

## 12. Failure-mode summary

| Dependency down | Effect |
| --- | --- |
| **Backend** | Static pages unaffected. Log page shows an error/empty state. Contact form shows an error. Admin unavailable. |
| **Postgres** | Static pages + contact form unaffected. Log page: if the Redis cache is warm, still served; otherwise error state. Log writes fail with a clear error. |
| **Redis** | Sessions unavailable → owner cannot log in, and existing sessions stop verifying mid-use (auth **fails closed** — a brief Redis blip logs the owner out; they log back in when it recovers). Login/contact rate limiters **fail closed** → those endpoints return `503` rather than run unprotected. Public Log page still works (cache **fails open**, one DB query per request). Static pages unaffected; the contact form is unavailable while the limiter store is down. |
| **Blob storage** | Only image upload fails; existing entries still render (URLs already stored). Everything else unaffected. |
| **Email provider** | Only the contact form is affected; it returns a graceful error. Everything else unaffected. |
| **Vercel/CDN** | The whole frontend is down; the backend API stays up but has no first-party UI. |

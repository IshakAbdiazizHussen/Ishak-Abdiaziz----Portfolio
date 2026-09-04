# Architecture

This document describes the two-service architecture: an independent **frontend**
(Next.js on Vercel) and an independent **backend** (Node.js + Express + TypeScript on
Railway), connected only by the frontend calling the backend's public REST API over
HTTPS.

`docs/constraints.md` lists the hard rules this architecture must never break.
`docs/project-definition.md` explains why the system is split this way, and defines the
current content model: **every page's content is owner-editable through a single
password-gated admin panel; design and layout are not, and remain fixed in the frontend
codebase.** This document is the technical "how."

---

## 1. Repository layout

```
your-portfolio/
  frontend/                 independent Next.js project
    package.json
    app/                    Next.js App Router root (valid: app/ is at THIS
                            project's root, and frontend/ has its own package.json)
    components/             layout + design-system components (static, not
                            owner-editable — see §3)
    content/                TS types + local dev/fallback values only. The
                            source of truth for every page's content is now
                            Postgres via the backend API — see §4.
    lib/                    fetch helpers that call the backend API
  backend/                  independent Node + Express + TypeScript server
    package.json
    src/
      index.ts              server entrypoint
      routes/               contact, admin, content, projects, toolbox, log
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
   (browser)        │   Every page's LAYOUT is static — built into   │
                    │   the bundle, served from Vercel's CDN:        │
                    │     /            Intro                         │
                    │     /built       Built                        │
                    │     /how-i-got-here                            │
                    │     /toolbox     Toolbox                       │
                    │     /log         Log                          │
                    │     /lets-talk   Let's Talk                   │
                    │                                               │
                    │   Every page's CONTENT is fetched from the     │
                    │   backend, ISR-cached — same pattern on all    │
                    │   six pages (see §4):                          │
                    │     GET /api/content/intro                    │
                    │     GET /api/content/how-i-got-here            │
                    │     GET /api/content/lets-talk                │
                    │     GET /api/projects                          │
                    │     GET /api/toolbox                           │
                    │     GET /api/log                                │
                    │                                               │
                    │   Owner reaches ONE admin panel behind login:  │
                    │     /admin       full content admin            │
                    │                  (Intro, Built + stats, How I  │
                    │                   Got Here, Toolbox, Log,      │
                    │                   Let's Talk links)            │
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
                    │   REST API (full list: §11):                  │
                    │     POST      /api/contact                    │
                    │     POST      /api/admin/login                │
                    │     GET/PUT   /api/content/:area   (public GET,│
                    │                                      auth PUT) │
                    │     POST      /api/content/upload    (auth)   │
                    │     GET/POST/PUT /api/projects[/…]   (public   │
                    │                             GET, auth write)  │
                    │     GET/POST/PUT /api/toolbox[/…]    (public   │
                    │                             GET, auth write)  │
                    │     GET       /api/log               (public) │
                    │     POST      /api/log               (auth)   │
                    │     POST      /api/log/upload        (auth)   │
                    └───┬───────────────┬───────────────┬───────────┘
                        │               │               │
          ┌─────────────┘   ┌───────────┘      ┌─────────┘         ┌───────────────┐
          ▼                 ▼                  ▼                   ▼
  ┌───────────────┐ ┌───────────────┐ ┌────────────────────┐ ┌──────────────────┐
  │ Postgres      │ │ Redis         │ │ Blob image storage │ │ Email provider   │
  │ (Neon /       │ │ (Railway      │ │ (Vercel Blob /     │ │ (Resend or sim.) │
  │  Supabase)    │ │  Redis plugin │ │  Cloudinary)       │ │                  │
  │               │ │  or Upstash)  │ │                    │ │ sends contact    │
  │ content_blocks│ │ - sessions    │ │ stores image files,│ │ form emails      │
  │ projects      │ │ - short-TTL   │ │ returns public URL │ │                  │
  │ project_stats │ │   cache, per  │ │                    │ │                  │
  │ toolbox_groups│ │   content area│ │                    │ │                  │
  │ toolbox_items │ │               │ │                    │ │                  │
  │ log_entries   │ │               │ │                    │ │                  │
  └───────────────┘ └───────────────┘ └────────────────────┘ └──────────────────┘
        ▲ backend only    ▲ backend only     ▲ backend only        ▲ backend only
```

### Components and responsibilities

| Component | Technology | Responsibility |
| --- | --- | --- |
| **Frontend** | Next.js App Router (TS) on Vercel | Presentation only. Renders all 6 pages inside a **fixed layout** (design tokens, components, navigation — never database-driven, see §3). Every page's *content* is fetched from the backend, ISR-cached, rather than hardcoded. Client-side `fetch` to the backend for admin login and every admin write. Contact form POSTs to the backend. **No DB client, no secrets, no auth logic, no email logic.** |
| **Backend** | Node.js + Express + TypeScript on Railway | All business logic, all data access, all secrets. Exposes the REST API for every content area, plus Log and contact. Talks to Postgres, Redis, blob storage, and the email provider. Enforces auth and CORS. |
| **Postgres** | Neon or Supabase | Stores **all owner-editable content**: `content_blocks` (Intro, How I Got Here, Let's Talk links), `projects` + `project_stats` (Built), `toolbox_groups` + `toolbox_items` (Toolbox), and `log_entries` (Log). See §3 for the schema. Accessed only by the backend. |
| **Redis** | Railway Redis plugin (or Upstash) | (1) Admin **session storage**. (2) Optional **short-TTL cache** (30–60s) of each content area's public GET response — the pattern originally built for `GET /api/log`, now used for every content area. Nothing else. Accessed only by the backend. |
| **Blob storage** | Vercel Blob or Cloudinary | Stores uploaded images — Log entry images and content image fields (Intro hero photo, How I Got Here photo). The DB only ever holds the returned URL string, never bytes. Written only by the backend's upload endpoints. |
| **Email provider** | Resend or similar | Delivers contact-form messages to the owner's inbox. Called only by the backend's contact endpoint. No DB. |

### What is static vs. dynamic, and why

| Layer | Mode | Why |
| --- | --- | --- |
| Page **layout** — routes, components, CSS, design tokens, the six-page navigation | **Static**, built into the frontend bundle, served from Vercel's CDN | Design and layout are explicitly **not** owner-editable (`docs/project-definition.md`). They change only on a frontend code edit + redeploy. |
| Page **content** — every field on every page (Intro, Built + stats, How I Got Here, Toolbox, Log, Let's Talk links) | **Dynamic** — fetched from the backend, ISR-cached | It reflects Postgres data the owner can change through the admin panel at any time, with **no frontend redeploy**. |
| `/admin` (admin panel) | **Dynamic** — client-side, auth-gated, `noindex` | Behind auth; must never be statically captured or indexed. |

**Rule of thumb (updated):** layout is code; content is data. Every page's *content* now
lives in Postgres and can change without a deploy; every page's *layout* still lives in
the frontend codebase and cannot change without one. This replaces the previous rule
("only Log changes without a deploy") now that Intro, Built, How I Got Here, Toolbox,
and the Let's Talk contact links are all data-backed too.

---

## 3. Data model

All owner-editable content lives in Postgres. Every image field stores a **URL string
only** — never bytes, never base64 — the same rule already enforced for
`log_entries.image_url`, now applied everywhere an image field exists.

Two shapes are used, deliberately:

- **`content_blocks`** — a generic key/value table for content that is a small, flat
  set of independent fields with no internal repetition: Intro, How I Got Here, and the
  Let's Talk contact links.
- **Real tables with foreign keys** — for content that is structured and repeating:
  Built's projects + their stats, and Toolbox's groups + items. A key/value row cannot
  express "this stat belongs to this project, in this order," so these get proper
  relations instead.

### `content_blocks`

| Column | Type | Notes |
| --- | --- | --- |
| `key` | text, **PK** | Stable identifier, e.g. `intro.headline`, `intro.subheadline`, `intro.hero_photo_url`, `how_i_got_here.body`, `how_i_got_here.photo_url`, `lets_talk.email`, `lets_talk.github_url`, `lets_talk.linkedin_url` |
| `value` | text | The field's text content. Empty/unused for image-only keys. |
| `image_url` | text, nullable | Set only for keys that hold an image. **URL string only.** |
| `updated_at` | timestamptz | Set on every write |

### `projects`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, **PK** | |
| `slug` | text, unique | `ai-image-classifier`, `research-agent` |
| `name` | text | |
| `role` | text | Display badge, e.g. `flagship` / `supporting` |
| `hook` | text | |
| `what_it_does` | text | |
| `decision_title` | text, nullable | |
| `decision_body` | text, nullable | |
| `stack` | text[] | |
| `demo_url` | text | |
| `source_url` | text | |
| `sort_order` | int | Locks display order on the Built page |
| `updated_at` | timestamptz | |

### `project_stats`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, **PK** | |
| `project_id` | uuid, **FK → `projects.id`** | |
| `label` | text | e.g. `"Overall accuracy"` |
| `value` | text | e.g. `"78.2%"` — stored as the exact display string, never re-derived by the frontend |
| `note` | text, nullable | e.g. `"deer — reported, not hidden"` |
| `sort_order` | int | |
| `updated_at` | timestamptz | |

### `toolbox_groups`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, **PK** | |
| `name` | text | e.g. `"Frontend"`, `"Backend"`, `"AI · ML"`, `"Infra"` |
| `sort_order` | int | |

### `toolbox_items`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, **PK** | |
| `group_id` | uuid, **FK → `toolbox_groups.id`** | |
| `name` | text | e.g. `"TypeScript"` |
| `note` | text, nullable | |
| `sort_order` | int | |

### `log_entries` (existing, unchanged)

`id`, `title`, `description`, `date`, `image_url`, `tags`, `created_at`. Listed here for
completeness — this table predates the rest of the content model and its shape does not
change.

> **Design tokens, layout components, and the navigation structure are not part of this
> data model and are not part of this data flow.** Nothing in Postgres describes a
> color, a font, a spacing value, a component's markup, or the six-page nav. All of
> that remains static in the frontend codebase (`frontend/app`, `frontend/components`,
> `frontend/app/globals.css`) and is untouched by anything the admin panel does.

---

## 4. Data flow: visitor viewing any page

Applies to all six pages: Intro, Built, How I Got Here, Toolbox, Log, and Let's Talk.
Every page's **content** now comes from the backend and Postgres — the old split
between "four static pages" and "one dynamic page (Log)" is gone. What is still
genuinely static is the page's **layout**: the Next.js route, its components, and all
CSS/design tokens are built into the frontend bundle and served from Vercel's CDN
exactly as before. Only the *content that fills that layout* is fetched at request
time.

```
1. Browser requests e.g. GET https://<frontend>/how-i-got-here
2. The frontend route fetches its content from the backend, ISR-cached:
       GET https://<backend>/api/content/how-i-got-here   (no credentials — public)
   (Built uses GET /api/projects, Toolbox uses GET /api/toolbox, Log uses
   GET /api/log, Let's Talk uses GET /api/content/lets-talk — different
   endpoints, identical pattern. Full list in §11.)
3. Backend handler for a public content GET:
     a. Try Redis:  GET cache:<area>:...
          - hit  → return the cached JSON immediately
          - miss OR Redis error → continue (cache read FAILS OPEN — a cache
            outage must not break a public page; same rule as the existing
            Log cache, §12)
     b. Query Postgres for that content area.
     c. On a cache miss, best-effort write back:
          SET cache:<area>:... <json>  EX <30-60s>
        (a failed cache write is swallowed — fail open)
     d. Respond 200 with the content JSON.
4. Next.js caches this response at the ISR layer (a `revalidate` window, or
   on-demand revalidation triggered by the owner-write flows in §7/§8/§9), so
   most requests are served from Vercel's cache without even reaching the
   backend. A cache miss or an expired revalidation window re-runs steps 2-3.
5. The frontend renders the page inside its fixed layout and components.
   Design and layout do not come from this fetch — the fetch only ever
   supplies field values (text, image URLs, stats, lists) for a layout the
   frontend already knows how to draw.
```

```
[Browser] ──GET /<page>──▶ [Vercel: Next.js, ISR cache]
                                │ (miss / revalidate)
                                ▼
                     GET /api/content/<area>  (or /api/projects,
                     /api/toolbox, /api/log)  ──▶ [Backend]
                                │
                                ├── GET cache:<area> ──▶ [Redis] (miss/error → fail open)
                                └── SELECT ──▶ [Postgres] ──▶ SET cache (EX 30-60s) ──▶ [Redis]
```

- **Latency path (cache hit):** browser → Vercel edge → done, same as before.
- **Latency path (cache miss / revalidation):** browser → Vercel → backend → Redis
  (fail open) → Postgres → back up the chain.
- **Failure modes:** if the backend or Postgres is down and a page's ISR cache has
  already expired, Next.js serves the last successfully rendered content for that page
  rather than erroring, where a prior render exists; otherwise the page shows an error
  state. A backend outage no longer has *zero* effect on every page the way it did when
  four pages were pure build-time SSG — this is the accepted trade-off of making all
  content owner-editable, and it is documented, not accidental (see
  `docs/project-definition.md`).
- **Design tokens, layout components, and the navigation structure are not part of this
  data flow.** They ship inside the Next.js build and never change because of what this
  fetch returns.

---

## 5. Data flow: visitor submitting the contact form

```
1. Visitor is on /lets-talk. Fills in name, email, message.
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
- **Not to be confused with the Let's Talk contact links** (the displayed
  email/GitHub/LinkedIn values) — those ARE stored content, edited by the owner through
  `content_blocks` and rendered via the flow in §4/§7. This section is only about a
  *visitor's* form submission, which is never stored anywhere.
- **Secrets involved (backend only):** `RESEND_API_KEY`, `CONTACT_TO_EMAIL`,
  `CONTACT_FROM_EMAIL`.

---

## 6. Data flow: owner logging in

> **Deployment prerequisite — the two services share one registrable domain.**
> The frontend is served from the apex/`www` (e.g. `ishak.dev`) and the backend from a
> subdomain of the same domain (e.g. `api.ishak.dev`). This is required so the session
> cookie works — see the "Session cookie" note below and §13. On the default platform
> hostnames (`*.vercel.app` + `*.up.railway.app`) the cookie approach does **not**
> work; custom domains on a shared parent are part of the design, not an optional
> polish step.

```
1. Owner opens /admin on the frontend (the full content admin panel — Intro,
   Built + stats, How I Got Here, Toolbox, Log, Let's Talk links, all behind
   this one login). No valid session cookie present → the page shows a
   password prompt.
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
     b. Rate limit BEFORE the compare, keyed by client IP (see §13 / trust
        proxy). Limiter store unavailable → 503 (FAIL CLOSED, constraint C13).
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
         see §16)
       - present → refresh the TTL (EXPIRE session:<id> <TTL>, and re-set the cookie
         Max-Age) so an actively-working session slides forward instead of expiring
         abruptly at the 7-day mark
       - attach the session to req and continue
7. This one session gates every admin route — content, projects, toolbox, and
   log — there is no separate login per content area.
8. Logout: POST /api/admin/logout → backend DEL session:<id> in Redis and
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

## 7. Data flow: owner editing simple content (Intro, How I Got Here, Toolbox, Let's Talk links)

Covers every content area that is **not** a Built project or stat (that has its own
extra step — see §8): Intro (headline, sub-headline, hero photo), How I Got Here (body,
photo), Toolbox (groups and items), and the Let's Talk contact links (email, GitHub
URL, LinkedIn URL). All calls use `credentials: 'include'`; the backend auth middleware
(§6) guards every write.

```
1. Owner opens the relevant tab in the single admin panel (§6) — no separate
   login per content area.
2. Text fields: owner edits inline, then saves:
       PUT https://<backend>/api/content/intro
       Content-Type: application/json     credentials: 'include'
       body: { headline, subheadline }
   Toolbox groups/items use their own resource paths (POST/PUT on
   /api/toolbox/groups and /api/toolbox/items — full list in §11), but the
   same read → edit → write shape applies.
3. Image fields (Intro hero photo, How I Got Here photo) follow the same
   two-stage pattern already built for Log images:
       a. POST /api/content/upload   (multipart file, credentials: 'include')
          → validated (MIME allowlist, magic-byte check, size limit), stored
            in blob storage under a namespaced path, returns { imageUrl }
       b. PUT /api/content/<area>  { ..., imageUrl }  writes the URL string
          into the relevant row/column — never the image bytes.
4. Backend handler for every write in this flow:
     a. Auth middleware: valid sid session, else 401. Stop.
     b. Validate + sanitize the field(s) (a schema per content area).
     c. UPDATE the relevant row(s) in Postgres — content_blocks,
        toolbox_groups, or toolbox_items — via a parameterized query.
        `updated_at` is set.
     d. Invalidate the Redis cache key for that content area's public GET
        (mirrors the existing `DEL cache:log:list` on Log writes).
     e. Respond 200 with the updated value.
5. The public page that reads this content is revalidated so the change is
   visible without a full redeploy: on-demand ISR revalidation of that
   specific route, or its short `revalidate` window simply expiring — same
   mechanism as §4. The next visitor request for that page reflects the new
   value.
6. Owner sees a success state and the updated value reflected in the admin
   panel's own preview.
```

- **Design and layout are out of scope for this flow.** It can only change the *value*
  of a field the frontend already knows how to render inside its fixed layout. It
  cannot add a field, remove a section, reorder the navigation, or change a page's
  structure — those remain frontend code changes (`docs/project-definition.md`).

---

## 8. Data flow: owner editing a Built project or its stats

Same shape as §7, with one addition: **any edit to a project's stat requires an
explicit confirm-before-save step** in the admin panel. A stat is a factual,
verifiable claim — "stats must be real, unrounded, and include the weak numbers" is a
project-definition rule — and previously that rule was enforced for free, because
changing a stat meant editing code and redeploying. Making stats editable at runtime
removes that natural pause point, so the confirm step puts it back deliberately.

```
1. Owner opens a project in the admin panel; edits a non-stat field (hook,
   whatItDoes, decisionTitle/Body, stack, demoUrl, sourceUrl) → the same flow
   as §7:
       PUT /api/projects/:id   { ...changed fields }   credentials: 'include'
   → validate → UPDATE the projects row → invalidate cache → revalidate
   /built (§4).

2. Owner edits a stat (label, value, or note) instead:
     a. The admin UI already has the CURRENT stat row loaded (fetched with
        the project).
     b. Owner types the new value. The UI does NOT submit yet.
     c. Before any network call, the UI shows an explicit confirmation step:
            "Old value:  78.2%
             New value:  81.4%
             Confirm this change?"
        with distinct Confirm / Cancel actions. This is a required UX gate,
        not an optional dialog.
     d. Only on Confirm does the browser send:
            PUT https://<backend>/api/projects/:id/stats/:statId
            Content-Type: application/json     credentials: 'include'
            body: { label, value, note }
        (a brand-new stat uses POST /api/projects/:id/stats and goes
        through the same confirm step first, comparing against "— none —".)
3. Backend handler (applies to both project-field and stat writes):
     a. Auth middleware: valid sid session, else 401. Stop.
     b. Validate + sanitize the field(s).
     c. For a stat write specifically: the request must target a known
        `project_stats` row by id (an update, never a blind upsert), and the
        backend stores exactly the value the owner confirmed — it never
        re-derives, rounds, or infers a stat.
     d. UPDATE the row in Postgres (`projects` or `project_stats`).
     e. Invalidate the Redis cache key for `GET /api/projects`.
     f. Respond 200 with the updated project/stat.
4. /built is revalidated (§4) so the new value appears on the public page.
```

- **Why the confirmation step matters:** every stat on the Built page is a promise the
  site makes to a technical interviewer that the number is real, measured, and
  reproducible (`docs/project-definition.md`). This is a **product requirement on the
  admin UI**, not a backend validation rule — the backend has no way to tell a
  "corrected typo" from an "inflated number," so the safeguard has to live at the point
  where a human makes the decision: showing old vs. new, side by side, before anything
  is written.
- Everything else about this flow — auth, validation, cache invalidation, page
  revalidation — is identical to §7.

---

## 9. Data flow: owner adding a Log entry

One concrete instance of the §7 pattern, kept in full detail here because it was the
first content area built and because Log entries are the one content area with a
two-stage image-then-row write that every other image field (§7 step 3) now copies.
Three stages: authenticate (§6), upload image, write row. All calls use
`credentials: 'include'` so the `sid` cookie is sent; the backend auth middleware
guards every one.

### 9a. Upload image → blob storage

```
1. Owner picks an image and fills in title, description, date, tags on the
   admin Log form.
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

### 9b. Write the row

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

## 10. Data flow: visitor viewing the Log page

A worked instance of §4's general pattern; kept here for the Log-specific rendering
details (image `src`, tags) that don't generalize to every content area.

```
1. Browser loads /log on the frontend.
2. The frontend requests entries from the backend:
       GET https://<backend>/api/log        (no credentials — public)
   Either from a client component on mount, or from a Server Component fetch,
   ISR-cached (§4). No Next.js API route is involved.
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

## 11. API endpoints

Every route the backend exposes, grouped by content area. `Auth` = requires a valid
`sid` session (§6). GET routes for content are all public (no credentials); every write
is auth-only.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/contact` | — | Visitor submits the contact form (§5) |
| `POST` | `/api/admin/login` | — | Owner logs in, receives the `sid` cookie (§6) |
| `POST` | `/api/admin/logout` | ✅ | Owner logs out, session deleted |
| `GET` | `/api/content/:area` | — | Read simple content for one area: `intro`, `how-i-got-here`, `lets-talk` (§4/§7) |
| `PUT` | `/api/content/:area` | ✅ | Write simple content fields for one area (§7) |
| `POST` | `/api/content/upload` | ✅ | Upload an image for a content field (Intro hero photo, How I Got Here photo); returns `{ imageUrl }` (§7) |
| `GET` | `/api/projects` | — | Read both projects with their stats (§4/§8) |
| `POST` | `/api/projects` | ✅ | Create a project row *(count is a product constraint enforced by policy, not by this endpoint — see `docs/constraints.md`)* |
| `PUT` | `/api/projects/:id` | ✅ | Update a project's non-stat fields (§8) |
| `POST` | `/api/projects/:id/stats` | ✅ | Add a stat to a project — **confirm-before-save required in the admin UI** (§8) |
| `PUT` | `/api/projects/:id/stats/:statId` | ✅ | Edit a stat's label/value/note — **confirm-before-save required in the admin UI** (§8) |
| `GET` | `/api/toolbox` | — | Read all groups with their items (§4/§7) |
| `POST` | `/api/toolbox/groups` | ✅ | Create a group (§7) |
| `PUT` | `/api/toolbox/groups/:id` | ✅ | Rename/reorder a group (§7) |
| `POST` | `/api/toolbox/groups/:id/items` | ✅ | Add an item to a group (§7) |
| `PUT` | `/api/toolbox/items/:id` | ✅ | Edit an item's name/note/order (§7) |
| `GET` | `/api/log` | — | Read the Log feed (§4/§10) |
| `POST` | `/api/log` | ✅ | Add a Log entry (§9b) |
| `POST` | `/api/log/upload` | ✅ | Upload a Log entry image (§9a) |

---

## 12. Why Redis now, and why it was rejected before

| | Previous architecture (single Next.js app, serverless API routes) | Current architecture (persistent Express backend) |
| --- | --- | --- |
| **Runtime model** | Each API request ran in a short-lived, stateless serverless function. Nothing persisted between requests in-process. | One long-lived Node process (or a small pool) with stable memory, a connection pool, and a Redis client held open. |
| **Sessions** | No persistent server to hold a session store; a signed stateless cookie was the only sane option, and Redis would have been infra with no home. | A real, revocable server-side session store is now both possible and standard. Session IDs live in Redis; logout and TTL actually evict them. |
| **Caching** | Serverless functions had no shared in-process cache; Vercel's CDN + Next.js static generation already covered performance. Adding Redis bought nothing. | A persistent server serving public content GETs under load benefits from a tiny shared cache per content area so repeated identical reads don't each hit Postgres. |
| **Verdict** | Redis correctly rejected — no session to store, nothing to cache. | Redis correctly included — real session storage need + genuine repeated-read caching across every content area. |

**Scope of Redis in this project (hard limit — see `docs/constraints.md`):**

- ✅ Admin **session storage** (`session:<id>` keys, TTL-bound, deleted on logout).
- ✅ **Optional short-TTL cache** of each content area's public GET response
  (`cache:log:list`, `cache:content:<area>`, `cache:projects`, `cache:toolbox` — 30–60s,
  invalidated on write, **fails open**).
- ❌ NOT general-purpose caching of other endpoints or queries.
- ❌ NOT rate limiting that fails open silently. Any rate limiting **fails closed**
  (503) — matching the Ai-image-classifier project's philosophy.
- ❌ NOT used in the frontend at all — the frontend has no server-side logic to cache.

---

## 13. CORS and the shared parent domain

### Domain layout (decided)

Both services run under **one registrable domain**:

| Service | Host (example) | Platform |
| --- | --- | --- |
| Frontend | `ishak.dev` (and `www.ishak.dev`) | Vercel |
| Backend | `api.ishak.dev` | Railway |

This is a hard requirement of the session design (§6): because `SameSite` is judged on
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
- Allowed methods: `GET, POST, PUT, OPTIONS`. Allowed headers: `Content-Type`.
  Preflight (`OPTIONS`) handled for the POST/PUT endpoints; preflight response cached
  10 minutes.
- A disallowed `Origin` gets **no** `Access-Control-Allow-Origin` header. The request
  is not rejected server-side — the browser blocks the response. Requests with **no**
  `Origin` header (curl, server-to-server, same-origin navigations) pass the CORS layer
  and are still gated by `requireAdmin` where it matters. CORS is a browser control,
  not the auth boundary.
- The check is one pure predicate (`backend/src/lib/originAllowlist.ts`), unit-tested,
  used by the single `cors` middleware. No route sets its own CORS headers.

**Vercel preview deployments — decided.** Every page now calls the backend for its
content (§4), so unlike the previous revision this is no longer limited to `/log` and
`/lets-talk`. The backend therefore accepts an optional **`CORS_PREVIEW_ORIGIN_REGEX`**
— a tight, anchored pattern (e.g. `^https://portfolio-[a-z0-9-]+\.vercel\.app$`); a
matching `Origin` is allowed through CORS so all **public** GET endpoints work on
preview URLs. It is **never** `*`, and it does **not** enable the admin cookie flow on
a preview (the `sid` cookie is still cross-site there). For admin QA on a preview,
alias it to `preview.<domain>` or run a staging backend. In the simplest setup the
regex is left unset.

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

## 14. Environment variables

### Frontend env vars (minimal — no secrets)

| Variable | Purpose | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | Base URL of the backend API, e.g. `https://api.ishak.dev` | Public by design; it's just a URL. Used by the frontend fetch helpers for every content area, not just Log. Must be a subdomain of the frontend's own domain (see §13). |
| `NEXT_PUBLIC_SITE_URL` *(optional)* | The frontend's own canonical URL, e.g. `https://ishak.dev`, for metadata / OG / sitemap | Public. |

That is the whole list. The frontend holds **no** database URL, **no** API keys, **no**
`ADMIN_PASSWORD`, **no** `SESSION_SECRET`.

### Backend env vars (all secret / server-only)

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Postgres client | Connection string (SSL enforced) |
| `REDIS_URL` | Redis client | Connection string for sessions + per-content-area caches |
| `ADMIN_PASSWORD` | `/api/admin/login` | The single shared admin password, gating the whole content admin panel |
| `SESSION_SECRET` | session middleware | Signs/encrypts the session cookie value |
| `SESSION_TTL_SECONDS` *(optional)* | session middleware | Session lifetime, TTL slid forward on each authed request (default e.g. 7 days) |
| `COOKIE_DOMAIN` | session middleware | The shared parent domain for the `sid` cookie, e.g. `.ishak.dev` (leave unset locally so it defaults to `localhost`) |
| `LOG_CACHE_TTL_SECONDS` *(optional)* | `/api/log` and, by the same pattern, the other content GETs | Content cache TTL (default 45) |
| `RESEND_API_KEY` | `/api/contact` | Email provider auth |
| `CONTACT_TO_EMAIL` | `/api/contact` | Where contact messages are delivered |
| `CONTACT_FROM_EMAIL` | `/api/contact` | Verified sender address |
| `BLOB_READ_WRITE_TOKEN` *(or `CLOUDINARY_*`)* | `/api/log/upload`, `/api/content/upload` | Blob storage auth, shared by every image-upload endpoint |
| `CORS_ALLOWED_ORIGINS` | CORS middleware | Comma-separated exact origins (`https://ishak.dev,https://www.ishak.dev,http://localhost:3000`) |
| `CORS_PREVIEW_ORIGIN_REGEX` *(optional)* | CORS middleware | Anchored regex; a matching Origin is allowed through CORS for the public GET endpoints (Vercel previews). Never `*`. |
| `TRUST_PROXY_HOPS` *(optional)* | server bootstrap | Proxy hops to trust for `req.ip`. Default `0` (local). **Railway: `1`.** Never fully permissive. |
| `PORT` | server bootstrap | Provided by Railway |

`.env` files on both sides are gitignored; each service ships a committed
`.env.example` listing its own variables with empty values.

---

## 15. Summary: dependencies per user action

| Action | Frontend render | Backend endpoint | Postgres | Redis | Blob storage | Email |
| --- | :--: | :--: | :--: | :--: | :--: | :--: |
| View Intro | ISR (cache-first) | `GET /api/content/intro` | ✅ SELECT on cache miss | ✅ read/write cache (fail open) | ✅ hero photo `src` | — |
| View Built | ISR (cache-first) | `GET /api/projects` | ✅ SELECT on cache miss | ✅ read/write cache (fail open) | — | — |
| View How I Got Here | ISR (cache-first) | `GET /api/content/how-i-got-here` | ✅ SELECT on cache miss | ✅ read/write cache (fail open) | ✅ photo `src` | — |
| View Toolbox | ISR (cache-first) | `GET /api/toolbox` | ✅ SELECT on cache miss | ✅ read/write cache (fail open) | — | — |
| View Let's Talk page | ISR (cache-first) | `GET /api/content/lets-talk` | ✅ SELECT on cache miss | ✅ read/write cache (fail open) | — | — |
| View Log page | ISR (cache-first) | `GET /api/log` | ✅ SELECT on cache miss | ✅ read/write cache (fail open) | ✅ image `src` | — |
| Submit contact form | dynamic (form + fetch) | `POST /api/contact` | — | — | — | ✅ |
| Owner logs in | dynamic (admin) | `POST /api/admin/login` | — | ✅ write session | — | — |
| Authed request (any) | dynamic (admin) | auth middleware | — | ✅ read session | — | — |
| Owner edits a simple content field | dynamic (admin) | `PUT /api/content/:area` | ✅ UPDATE | ✅ read session + invalidate cache | — | — |
| Owner uploads a content image | dynamic (admin) | `POST /api/content/upload` | — | ✅ read session | ✅ | — |
| Owner edits a project field | dynamic (admin) | `PUT /api/projects/:id` | ✅ UPDATE | ✅ read session + invalidate cache | — | — |
| Owner edits a project stat *(confirm-before-save)* | dynamic (admin) | `PUT/POST /api/projects/:id/stats[...]` | ✅ UPDATE/INSERT | ✅ read session + invalidate cache | — | — |
| Owner edits Toolbox groups/items | dynamic (admin) | `PUT/POST /api/toolbox/...` | ✅ UPDATE/INSERT | ✅ read session + invalidate cache | — | — |
| Owner uploads Log image | dynamic (admin) | `POST /api/log/upload` | — | ✅ read session | ✅ | — |
| Owner writes Log entry | dynamic (admin) | `POST /api/log` | ✅ INSERT | ✅ read session + `DEL cache:log:list` | — | — |

---

## 16. Failure-mode summary

| Dependency down | Effect |
| --- | --- |
| **Backend** | Page **layout** always renders (it's static in the bundle). Page **content** falls back to the last successfully rendered ISR output where one exists, or an error/empty state otherwise — this now applies to every page, not just Log, because every page fetches content from the backend. Contact form shows an error. Admin unavailable. |
| **Postgres** | Contact form unaffected. Every content page: served from a warm Redis cache if one exists; otherwise an error/stale-content state. Every admin write (content, projects, stats, toolbox, log) fails with a clear error. |
| **Redis** | Sessions unavailable → owner cannot log in, and existing sessions stop verifying mid-use (auth **fails closed** — a brief Redis blip logs the owner out; they log back in when it recovers). Login/contact rate limiters **fail closed** → those endpoints return `503` rather than run unprotected. Public content pages still work (each content cache **fails open**, one DB query per request per area). Page layout unaffected; the contact form is unavailable while the limiter store is down. |
| **Blob storage** | Only image upload fails; existing images (Log entries, Intro hero photo, How I Got Here photo) still render — URLs already stored. Everything else unaffected. |
| **Email provider** | Only the contact form is affected; it returns a graceful error. Everything else unaffected. |
| **Vercel/CDN** | The whole frontend is down; the backend API stays up but has no first-party UI. |

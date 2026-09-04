# Portfolio frontend

Independent Next.js (App Router) project. **Presentation only** — it renders the six
pages and reaches the backend over HTTP for the Log and contact features. It holds no
database client, no secrets, and no business logic (constraint C3), and it has **no
Next.js API routes**.

Source of truth: `../docs/` — read `architecture.md`, `constraints.md`,
`project-definition.md`, and `development-plan.md` before changing anything.

## Requirements

- Node >= 20
- The backend running (for the dynamic pages — Log, Let's Talk, admin). The four static
  pages need nothing.

## Local setup

```bash
cd frontend
npm install
cp .env.example .env.local     # NEXT_PUBLIC_BACKEND_URL defaults to http://localhost:4000
npm run dev                     # http://localhost:3000
```

## Scripts

| Script                            | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `npm run dev`                     | Dev server on `http://localhost:3000`                   |
| `npm run build` / `npm start`     | Production build / serve                                |
| `npm run lint`                    | ESLint (Next core-web-vitals + TS, Prettier-compatible) |
| `npm run typecheck`               | `tsc --noEmit`                                          |
| `npm run format` / `format:check` | Prettier                                                |

## Configuration

Only `NEXT_PUBLIC_*` values — all public, all safe in the browser bundle. See
`.env.example`. `lib/env.ts` throws at startup if `NEXT_PUBLIC_BACKEND_URL` is missing.

| Variable                  | Purpose                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API base URL (no trailing slash). Production: a subdomain of the site domain, e.g. `https://api.ishak.dev`. |
| `NEXT_PUBLIC_SITE_URL`    | This site's canonical URL, for metadata. Optional locally.                                                          |

## Layout

```
app/            App Router routes (root of this project)
  layout.tsx    root layout — dark, fonts, metadata
  page.tsx      Intro (placeholder until feature 7)
  globals.css   baseline only (design tokens: feature 6)
components/      shared UI (feature 6+)
content/         hardcoded static page content (feature 7)
lib/
  env.ts        public runtime config
  backend.ts    backendFetch() — the ONLY path to the backend API
  types.ts      LogEntry (mirrors backend/src/lib/types.ts)
styles/          shared styles (feature 6)
```

## How the frontend talks to the backend

Every API call goes through `backendFetch(path, { auth })` in `lib/backend.ts`:

- `auth: false` → `credentials: "omit"` — public: `GET /api/log`, `POST /api/contact`
- `auth: true` → `credentials: "include"` — sends the `sid` cookie: admin login/session,
  `POST /api/log`, `POST /api/log/upload`

The session cookie is `HttpOnly` and same-site (`ishak.dev` ↔ `api.ishak.dev` in
production), so the frontend never reads it — it only reacts to `200` / `401`.

## Admin

`/admin` is a single sidebar-driven area (feature 16) covering all six content
sections — Intro, Built, How I Got Here, Toolbox, Log, Let's Talk — behind one
`GET /api/admin/session` check in `app/admin/layout.tsx` (via `AdminShell`). Bare
`/admin` redirects to `/admin/log` (the owner's-preference choice over a
section-picker landing, since Log was already the working section from feature 10).
`AdminSidebar` provides the section links + logout; each `/admin/<section>` route is
its own page. Only Log has a real form so far — the other five are placeholders
until feature 17.

## Deployment (summary — see `../docs/development-plan.md` feature 12)

Vercel, root directory `frontend/`, custom domain `<shared-domain>` (+ `www`). The
backend must be a subdomain of the same registrable domain for the cookie to work.

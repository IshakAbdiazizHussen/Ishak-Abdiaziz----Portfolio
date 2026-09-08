# Portfolio backend

Independent Node.js + Express + TypeScript server. Owns all data access, auth, and
secrets; exposes a small REST API the frontend calls over HTTPS.

**Two run modes, same Express app (`src/app.ts`, `createApp()`):**

- **Local dev** — `src/index.ts` calls `createApp().listen(PORT)` (`npm run dev` / `npm
start`). A normal long-running server.
- **Vercel** — `api/index.ts` exports `createApp()` as the default export; `vercel.json`
  rewrites every path to that one serverless function. An Express app is itself an
  `(req, res)` handler, so Vercel invokes it directly — no `serverless-http`, no route
  changes. See "Deployment" below.

The source of truth for this service is `../docs/` — read `architecture.md`,
`constraints.md`, `project-definition.md`, and `development-plan.md` before changing
anything here.

## Requirements

- Node >= 20
- A Postgres database (Neon or Supabase) — `DATABASE_URL`
- An **Upstash Redis** database — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
  (from the Upstash console → Database → "REST API"). The client is `@upstash/redis`
  over HTTP — stateless, no connection pool, works on serverless. There is **no**
  `REDIS_URL` / TCP client.

## Local setup

```bash
cd backend
npm install
cp .env.example .env      # fill in DATABASE_URL, UPSTASH_REDIS_REST_URL,
                          #   UPSTASH_REDIS_REST_TOKEN, ADMIN_PASSWORD, SESSION_SECRET
npm run migrate           # apply db/*.sql to the database in DATABASE_URL
npm run dev               # http://localhost:4000  (starts a throwaway Postgres via ./dev.sh)
```

**Local Redis, two options:**

1. **Simplest** — point `UPSTASH_REDIS_REST_URL/_TOKEN` at an Upstash database. Use a
   _separate_ free database for local so you don't share session/cache state with
   production.
2. **Fully offline / isolated** — run the Upstash-REST-compatible shim in front of a
   local Redis:
   ```bash
   docker run -d --rm --name pf-redis -p 6400:6379 redis:7-alpine
   docker run -d --rm --name pf-srh -p 8079:80 \
     -e SRH_MODE=env -e SRH_TOKEN=local_dev_token \
     -e SRH_CONNECTION_STRING="redis://host.docker.internal:6400" \
     hiett/serverless-redis-http:latest
   # .env: UPSTASH_REDIS_REST_URL=http://localhost:8079
   #       UPSTASH_REDIS_REST_TOKEN=local_dev_token
   ```

Check it: `curl -s localhost:4000/health` → `{"ok":true,"postgres":true,"redis":true}`.

## Scripts

| Script                            | What it does                                      |
| --------------------------------- | ------------------------------------------------- |
| `npm run dev`                     | Watch-mode server via `tsx`                       |
| `npm run build`                   | Type-check + emit to `dist/`                      |
| `npm start`                       | Run the compiled server (`dist/src/index.js`)     |
| `npm run typecheck`               | `tsc --noEmit` — the lint gate for this service   |
| `npm test`                        | Vitest (pure unit tests: upload validation, etc.) |
| `npm run migrate`                 | Apply pending SQL migrations (local, via `tsx`)   |
| `npm run migrate:prod`            | Same, from compiled output (deploy release step)  |
| `npm run format` / `format:check` | Prettier                                          |

## Configuration

Every variable is documented in `.env.example`. Policy:

- **Missing / malformed required config → the process exits at startup.** Required:
  `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_PASSWORD`,
  `SESSION_SECRET`, `CORS_ALLOWED_ORIGINS`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`,
  `CONTACT_FROM_EMAIL`. (`BLOB_READ_WRITE_TOKEN` is optional — blank falls back to the
  local-disk storage driver, which is dev-only.)
- **Present-but-unreachable Postgres/Redis → the server still starts**; `GET /health`
  returns `503` with per-dependency status and recovers on its own when the dependency
  comes back.
- `TRUST_PROXY_HOPS` is the number of proxy hops to trust for `req.ip`. Default `0`
  (local — trust nothing, `X-Forwarded-For` ignored). **Set it to `1` on Railway**
  (exactly one proxy hop). Never a value that makes Express `trust proxy` fully
  permissive — that lets clients spoof their IP and defeat the rate limiters.
- `COOKIE_DOMAIN` is the shared parent domain for the session cookie (e.g. `.ishak.dev`
  in production). Leave it blank locally.

## CORS

One config, in `src/middleware/cors.ts`, driven entirely by env. No route sets its own
CORS headers.

- `Access-Control-Allow-Origin` is an **exact-match allowlist** from
  `CORS_ALLOWED_ORIGINS`. **Never `*`** (also incompatible with
  `Access-Control-Allow-Credentials: true`, which the session cookie needs).
- Methods: `GET, POST, OPTIONS`. Allowed headers: `Content-Type`. Preflight cached
  10 min.
- A disallowed `Origin` gets **no** allow-origin header — the request isn't rejected
  server-side, the browser blocks the response. Requests with no `Origin` (curl,
  server-to-server) pass through and are still gated by `requireAdmin` where it matters.
- **Vercel preview deployments:** the four static pages need no backend. `/log` and
  `/lets-talk` call the public endpoints, which a `*.vercel.app` preview origin can't
  reach unless you set `CORS_PREVIEW_ORIGIN_REGEX` to a tight, anchored pattern (e.g.
  `^https://portfolio-[a-z0-9-]+\.vercel\.app$`). That only helps the **public**
  endpoints — the admin cookie flow is cross-site on a preview and won't work there;
  for admin QA on a preview, alias it to `preview.<domain>` or run a staging backend.
- `trust proxy` is pinned to `TRUST_PROXY_HOPS` (Railway = `1`), never `true`, so
  `req.ip` — and the rate limiters keyed on it — can't be spoofed via
  `X-Forwarded-For`.

## Layout

```
api/
  index.ts             Vercel entrypoint — exports createApp() as the handler (adapter only)
vercel.json            rewrites every path -> the api/index function; buildCommand = typecheck
src/
  config.ts            typed env (the only place process.env is read)
  app.ts               Express app assembly (testable, no listener) — used by BOTH run modes
  index.ts             local dev: createApp().listen() + graceful shutdown
  lib/
    logger.ts          pino, with secret redaction
    db.ts              Postgres client + pingDb()
    redis.ts           Redis client + pingRedis()
    errors.ts          AppError + helpers
    originAllowlist.ts pure origin-check predicate (exact + optional preview regex)
  middleware/
    cors.ts            exact-match origin allowlist, credentials, never "*"
    errorHandler.ts    single central error + 404 handlers
  scripts/
    migrate.ts         forward-only migration runner
db/
  001_init.sql         schema
```

## Deployment (summary — see `../docs/development-plan.md` feature 12)

**Vercel (current):**

- Vercel project, Root Directory = `backend/`, Framework Preset = **Other**.
- `vercel.json` (committed) does the work: `buildCommand` = `npm run typecheck` (no
  `dist/` needed — `@vercel/node` builds `api/index.ts` itself), and one catch-all
  rewrite sends **every** path to the `api/index` serverless function, which is the
  whole Express app. `req.url` is preserved, so Express routes `/api/...` and `/health`
  exactly as it does locally.
- Set all env vars (see `.env.example`) in the Vercel project. `COOKIE_DOMAIN` unset.
  `NODE_ENV=production`. `BLOB_READ_WRITE_TOKEN` must be a real token (serverless has no
  disk). Migrations are **not** part of the deploy — run `npm run migrate` against the
  production database from your machine (or a one-off CI step) after a schema change.
- The frontend reaches this via its own `/api/backend/*` same-origin proxy
  (`BACKEND_URL` = this project's URL) — see `../docs/architecture.md` §13.
- **Known follow-up:** PDF-preview generation (`pdf-to-img` in `src/lib/pdfThumbnail.ts`)
  loads its dependency through a runtime `import()` the bundler can't see, so
  `pdf-to-img` / `@napi-rs/canvas` may be missing from the function bundle. If PDF
  uploads 5xx on Vercel, add a `functions` block to `vercel.json` with `includeFiles`
  for those packages (or vendor a static import). Image uploads and every other route
  are unaffected.

**Railway (alternative — a plain persistent server):**

- `api/index.ts` / `vercel.json` are inert there. Start command `npm start`
  (`node dist/src/index.js` after `npm run build`), `TRUST_PROXY_HOPS=1`, custom domain
  optional. Nothing else changes.

All secrets set in the host's project settings; nothing committed.

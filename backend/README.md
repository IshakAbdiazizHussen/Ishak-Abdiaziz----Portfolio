# Portfolio backend

Independent Node.js + Express + TypeScript server. Owns all data access, auth, and
secrets; exposes a small REST API the frontend calls over HTTPS. Deployed as a
persistent server (Railway).

The source of truth for this service is `../docs/` — read `architecture.md`,
`constraints.md`, `project-definition.md`, and `development-plan.md` before changing
anything here.

## Requirements

- Node >= 20
- A Postgres database (Neon or Supabase) — `DATABASE_URL`
- A Redis instance (Railway Redis / Upstash) — `REDIS_URL`

## Local setup

```bash
cd backend
npm install
cp .env.example .env      # then fill in DATABASE_URL, REDIS_URL, ADMIN_PASSWORD, SESSION_SECRET
npm run migrate           # apply db/*.sql to the database in DATABASE_URL
npm run dev               # http://localhost:4000
```

Check it: `curl -s localhost:4000/health` → `{"ok":true,"postgres":true,"redis":true}`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Watch-mode server via `tsx` |
| `npm run build` | Type-check + emit to `dist/` |
| `npm start` | Run the compiled server (`dist/src/index.js`) |
| `npm run typecheck` | `tsc --noEmit` — the lint gate for this service |
| `npm test` | Vitest (pure unit tests: upload validation, etc.) |
| `npm run migrate` | Apply pending SQL migrations (local, via `tsx`) |
| `npm run migrate:prod` | Same, from compiled output (deploy release step) |
| `npm run format` / `format:check` | Prettier |

## Configuration

Every variable is documented in `.env.example`. Policy:

- **Missing / malformed required config → the process exits at startup.** Required:
  `DATABASE_URL`, `REDIS_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `CORS_ALLOWED_ORIGINS`
  (and `BLOB_READ_WRITE_TOKEN` once the upload endpoint is in use).
- **Present-but-unreachable Postgres/Redis → the server still starts**; `GET /health`
  returns `503` with per-dependency status and recovers on its own when the dependency
  comes back.
- `TRUST_PROXY_HOPS` is the number of proxy hops to trust for `req.ip` (Railway = `1`).
  Never set it so that `trust proxy` becomes `true` — that lets clients spoof their IP
  and defeat the rate limiters.
- `COOKIE_DOMAIN` is the shared parent domain for the session cookie (e.g. `.ishak.dev`
  in production). Leave it blank locally.

## Layout

```
src/
  config.ts            typed env (the only place process.env is read)
  app.ts               Express app assembly (testable, no listener)
  index.ts             listener + graceful shutdown
  lib/
    logger.ts          pino, with secret redaction
    db.ts              Postgres client + pingDb()
    redis.ts           Redis client + pingRedis()
    errors.ts          AppError + helpers
  middleware/
    cors.ts            exact-match origin allowlist
    errorHandler.ts    single central error + 404 handlers
  scripts/
    migrate.ts         forward-only migration runner
db/
  001_init.sql         schema
```

## Deployment (summary — see `../docs/development-plan.md` feature 12)

- Host: Railway, custom domain `api.<shared-domain>`.
- Release step runs `npm run build` then `npm run migrate:prod`.
- Start command: `npm start`.
- All secrets set in Railway project settings; nothing committed.

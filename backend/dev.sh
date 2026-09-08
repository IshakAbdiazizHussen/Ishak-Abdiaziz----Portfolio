#!/usr/bin/env bash
# Local dev: start a throwaway Postgres, migrate, run the backend.
# Redis is Upstash (REST) — set UPSTASH_REDIS_REST_URL / _TOKEN in .env; nothing
# to run locally for it. The Postgres container is --rm with no volume, so its
# data is wiped when it stops.
set -e

cd "$(dirname "$0")"

echo "→ starting Postgres container"
docker rm -f pf-pg >/dev/null 2>&1 || true
docker run -d --rm --name pf-pg -p 5400:5432 \
  -e POSTGRES_PASSWORD=pf -e POSTGRES_DB=portfolio postgres:16-alpine >/dev/null

echo "→ waiting for Postgres"
until docker exec pf-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

echo "→ migrating"
npm run migrate

echo "→ backend on http://localhost:4000  (Ctrl-C to stop; then: docker rm -f pf-pg)"
npm run dev

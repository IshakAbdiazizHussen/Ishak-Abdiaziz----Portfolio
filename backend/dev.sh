#!/usr/bin/env bash
# Local dev: start throwaway Postgres + Redis, migrate, run the backend.
# The containers are --rm with no volume, so data is wiped when they stop.
set -e

cd "$(dirname "$0")"

echo "→ starting containers"
docker rm -f pf-redis pf-pg >/dev/null 2>&1 || true
docker run -d --rm --name pf-redis -p 6400:6379 redis:7-alpine >/dev/null
docker run -d --rm --name pf-pg -p 5400:5432 \
  -e POSTGRES_PASSWORD=pf -e POSTGRES_DB=portfolio postgres:16-alpine >/dev/null

echo "→ waiting for Postgres"
until docker exec pf-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

echo "→ migrating"
npm run migrate

echo "→ backend on http://localhost:4000  (Ctrl-C to stop; then: docker rm -f pf-redis pf-pg)"
npm run dev

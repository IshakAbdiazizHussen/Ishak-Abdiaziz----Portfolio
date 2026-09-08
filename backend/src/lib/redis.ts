import { Redis } from "@upstash/redis";
import { config } from "../config";

/**
 * Single shared Redis client — Upstash over its REST API.
 *
 * Stateless HTTP: there is no socket, no connection pool, and nothing to close.
 * Every command is an independent HTTPS request, which is exactly what a
 * serverless deploy needs. Command errors (network, auth, Upstash outage)
 * propagate to the caller, which decides the policy:
 *   - session reads and the rate limiter treat a Redis error as FAIL CLOSED
 *   - the content/log caches treat a Redis error as FAIL OPEN
 *
 * `automaticDeserialization: false` keeps `get`/`set` as plain strings so the
 * callers' own `JSON.stringify` / `JSON.parse` stays the single source of
 * (de)serialization — the same contract the previous ioredis client had.
 */
export const redis = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN,
  automaticDeserialization: false,
});

export async function pingRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}

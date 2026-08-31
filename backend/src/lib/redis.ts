import Redis from "ioredis";
import { config } from "../config";
import { logger } from "./logger";

/**
 * Single shared Redis client. This module only creates the client.
 *
 * Commands fail fast-ish when Redis is unavailable (`maxRetriesPerRequest: 2`,
 * `commandTimeout`), which callers rely on:
 *   - session reads and the rate limiter treat a Redis error as FAIL CLOSED
 *   - the Log-list cache treats a Redis error as FAIL OPEN
 * An error on the client itself is logged but never crashes the process.
 */
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 2,
  commandTimeout: 3000,
  enableOfflineQueue: true,
  retryStrategy: (times) => Math.min(times * 200, 2000),
  lazyConnect: false,
});

redis.on("error", (err: unknown) => {
  logger.error({ err }, "redis client error");
});

export async function pingRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}

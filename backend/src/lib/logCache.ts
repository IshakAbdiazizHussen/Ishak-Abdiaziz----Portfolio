import { redis } from "./redis";
import { config } from "../config";
import { logger } from "./logger";
import type { LogEntry } from "./types";

/**
 * Short-TTL cache of the `GET /api/log` response. Single key, invalidated on
 * write. FAILS OPEN: every Redis error here is swallowed — the public Log page
 * must keep working (with one DB query per request) when Redis is down.
 */
const KEY = "cache:log:list";

export async function readCachedList(): Promise<LogEntry[] | null> {
  try {
    const json = await redis.get(KEY);
    if (!json) return null;
    return JSON.parse(json) as LogEntry[];
  } catch (err) {
    logger.warn({ err }, "log cache read failed (fail open)");
    return null;
  }
}

export async function writeCachedList(entries: LogEntry[]): Promise<void> {
  try {
    await redis.set(KEY, JSON.stringify(entries), "EX", config.LOG_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, "log cache write failed (ignored)");
  }
}

export async function invalidateList(): Promise<void> {
  try {
    await redis.del(KEY);
  } catch (err) {
    logger.warn({ err }, "log cache invalidate failed (ignored)");
  }
}

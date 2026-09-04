import { redis } from "./redis";
import { config } from "../config";
import { logger } from "./logger";
import type { ToolboxGroup } from "./types";

/**
 * Short-TTL cache of the `GET /api/toolbox` response. Single key, invalidated
 * on any group/item write. FAILS OPEN, mirroring
 * logCache.ts/contentCache.ts/projectsCache.ts exactly: every Redis error
 * here is swallowed — the public Toolbox page must keep working (with one DB
 * query per request) when Redis is down. Reuses `LOG_CACHE_TTL_SECONDS`, the
 * same convention as every other content cache (see docs/architecture.md
 * §14) — the fourth and last of the content caches this project uses.
 */
const KEY = "cache:toolbox";

export async function readCachedToolbox(): Promise<ToolboxGroup[] | null> {
  try {
    const json = await redis.get(KEY);
    if (!json) return null;
    return JSON.parse(json) as ToolboxGroup[];
  } catch (err) {
    logger.warn({ err }, "toolbox cache read failed (fail open)");
    return null;
  }
}

export async function writeCachedToolbox(groups: ToolboxGroup[]): Promise<void> {
  try {
    await redis.set(KEY, JSON.stringify(groups), "EX", config.LOG_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, "toolbox cache write failed (ignored)");
  }
}

export async function invalidateToolbox(): Promise<void> {
  try {
    await redis.del(KEY);
  } catch (err) {
    logger.warn({ err }, "toolbox cache invalidate failed (ignored)");
  }
}

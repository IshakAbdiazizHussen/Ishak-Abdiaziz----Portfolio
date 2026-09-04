import { redis } from "./redis";
import { config } from "../config";
import { logger } from "./logger";
import type { ContentArea } from "./contentRepo";

/**
 * Short-TTL cache of each content area's `GET /api/content/:area` response.
 * One key per area, invalidated on write. FAILS OPEN, mirroring logCache.ts
 * exactly: every Redis error here is swallowed — a public content page must
 * keep working (with one DB query per request) when Redis is down. Reuses
 * `LOG_CACHE_TTL_SECONDS` for the TTL — the same short-TTL cache convention,
 * now applied to every content area, not a new setting (see
 * docs/architecture.md §14).
 */
const keyFor = (area: ContentArea): string => `cache:content:${area}`;

export async function readCachedArea(area: ContentArea): Promise<Record<string, string> | null> {
  try {
    const json = await redis.get(keyFor(area));
    if (!json) return null;
    return JSON.parse(json) as Record<string, string>;
  } catch (err) {
    logger.warn({ err, area }, "content cache read failed (fail open)");
    return null;
  }
}

export async function writeCachedArea(
  area: ContentArea,
  fields: Record<string, string>,
): Promise<void> {
  try {
    await redis.set(keyFor(area), JSON.stringify(fields), "EX", config.LOG_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, area }, "content cache write failed (ignored)");
  }
}

export async function invalidateArea(area: ContentArea): Promise<void> {
  try {
    await redis.del(keyFor(area));
  } catch (err) {
    logger.warn({ err, area }, "content cache invalidate failed (ignored)");
  }
}

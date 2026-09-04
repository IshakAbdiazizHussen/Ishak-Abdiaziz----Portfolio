import { redis } from "./redis";
import { config } from "../config";
import { logger } from "./logger";
import type { Project } from "./types";

/**
 * Short-TTL cache of the `GET /api/projects` response. Single key,
 * invalidated on any project or stat write. FAILS OPEN, mirroring
 * logCache.ts/contentCache.ts exactly: every Redis error here is swallowed —
 * the public Built page must keep working (with one DB query per request)
 * when Redis is down. Reuses `LOG_CACHE_TTL_SECONDS`, same convention as
 * contentCache.ts (see docs/architecture.md §14).
 */
const KEY = "cache:projects";

export async function readCachedProjects(): Promise<Project[] | null> {
  try {
    const json = await redis.get(KEY);
    if (!json) return null;
    return JSON.parse(json) as Project[];
  } catch (err) {
    logger.warn({ err }, "projects cache read failed (fail open)");
    return null;
  }
}

export async function writeCachedProjects(projects: Project[]): Promise<void> {
  try {
    await redis.set(KEY, JSON.stringify(projects), "EX", config.LOG_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, "projects cache write failed (ignored)");
  }
}

export async function invalidateProjects(): Promise<void> {
  try {
    await redis.del(KEY);
  } catch (err) {
    logger.warn({ err }, "projects cache invalidate failed (ignored)");
  }
}

import { redis } from "./redis";
import { AppError } from "./errors";

/**
 * Small Redis-backed fixed-window limiter, shared by the login and contact
 * endpoints.
 *
 * FAIL CLOSED (constraint C13): if Redis is unavailable the call throws a 503 —
 * the protected endpoint is never allowed to run unthrottled.
 *
 * The window key is created atomically with its TTL (`SET ... EX ... NX` then
 * `INCR` in one MULTI/EXEC transaction), so a lost `EXPIRE` can never strand a
 * permanent key and lock the caller out forever. `@upstash/redis`'s `multi()`
 * issues a real `MULTI`/`EXEC` and throws if the transaction fails.
 */
export async function limit(
  scope: string,
  key: string,
  max: number,
  windowSec: number,
): Promise<void> {
  const redisKey = `ratelimit:${scope}:${key}`;

  let count: number;
  try {
    const results = await redis
      .multi()
      .set(redisKey, "0", { ex: windowSec, nx: true })
      .incr(redisKey)
      .exec();

    // [setReply, incrReply]; a failed transaction throws before we get here.
    count = Number(results[1]);
    if (!Number.isFinite(count)) throw new Error("rate limiter: non-numeric counter");
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(503, "Rate limiter unavailable", false);
  }

  if (count > max) {
    throw new AppError(429, "Too many requests");
  }
}

/** Clear a limiter counter, e.g. after a successful login. Best effort. */
export async function resetLimit(scope: string, key: string): Promise<void> {
  try {
    await redis.del(`ratelimit:${scope}:${key}`);
  } catch {
    /* ignore */
  }
}

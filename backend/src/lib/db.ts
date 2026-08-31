import postgres from "postgres";
import { config } from "../config";

/**
 * Single pooled Postgres client. This module only creates the client — no
 * queries live here (see `logRepo.ts`).
 *
 * SSL is required for any non-local host. A connection failure here does not
 * crash the process; queries reject and `pingDb()` reports unhealthy.
 */
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(config.DATABASE_URL);

export const sql = postgres(config.DATABASE_URL, {
  ssl: isLocal ? false : "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {
    // suppress NOTICE spam
  },
});

export async function pingDb(): Promise<boolean> {
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
}

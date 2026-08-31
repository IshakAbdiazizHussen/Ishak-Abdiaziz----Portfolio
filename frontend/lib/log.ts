import { backendFetch } from "./backend";
import type { LogEntry } from "./types";

interface LogListResponse {
  entries: LogEntry[];
}

/**
 * Fetch the public Log feed from the backend. No credentials.
 *
 * `cache: "no-store"` — the frontend keeps NO cache of its own (constraint C2);
 * the backend owns the short-TTL Redis cache behind this endpoint. This makes
 * the `/log` route dynamic.
 *
 * Throws on a non-2xx response or a network failure; the page catches it and
 * renders an error state.
 */
export async function fetchLogEntries(): Promise<LogEntry[]> {
  const data = await backendFetch<LogListResponse>("/api/log", {
    auth: false,
    cache: "no-store",
  });

  if (!data || !Array.isArray(data.entries)) {
    throw new Error("Unexpected /api/log response shape");
  }
  return data.entries;
}

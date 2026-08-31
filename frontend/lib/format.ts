/**
 * Locale- and timezone-fixed date formatting so server and client render the
 * same string (no hydration mismatch).
 */

const LOG_DATE = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** `"2026-08-20"` → `"Aug 20, 2026"`. Falls back to the raw string if malformed. */
export function formatLogDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const [, y, m, d] = match;
  return LOG_DATE.format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))));
}

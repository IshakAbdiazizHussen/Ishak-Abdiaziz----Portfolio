/**
 * Shared frontend types.
 *
 * `LogEntry` mirrors the backend's `GET /api/log` response contract
 * (`backend/src/lib/types.ts`). Kept in sync by hand — if the backend shape
 * changes, change it here too.
 */
export interface LogEntry {
  id: string;
  title: string;
  description: string;
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
  imageUrl: string;
  tags: string[];
  /** ISO 8601 timestamp. */
  createdAt: string;
}

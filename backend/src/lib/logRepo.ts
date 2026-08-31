import { sql } from "./db";
import type { LogEntry, NewLogEntry } from "./types";

/**
 * All Log SQL lives here. Queries are parameterized (postgres.js tagged
 * templates); routes never build SQL.
 */

interface Row {
  id: string;
  title: string;
  description: string;
  date: string; // to_char(...) -> text
  image_url: string;
  tags: string[] | null;
  created_at: Date | string;
}

function toEntry(row: Row): LogEntry {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    imageUrl: row.image_url,
    tags: row.tags ?? [],
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function listEntries(): Promise<LogEntry[]> {
  const rows = await sql<Row[]>`
    select id, title, description,
           to_char(date, 'YYYY-MM-DD') as date,
           image_url, tags, created_at
    from log_entries
    order by date desc, created_at desc
  `;
  return rows.map(toEntry);
}

export async function createEntry(input: NewLogEntry): Promise<LogEntry> {
  const rows = await sql<Row[]>`
    insert into log_entries (title, description, date, image_url, tags)
    values (
      ${input.title},
      ${input.description},
      ${input.date}::date,
      ${input.imageUrl},
      ${input.tags}
    )
    returning id, title, description,
              to_char(date, 'YYYY-MM-DD') as date,
              image_url, tags, created_at
  `;
  const row = rows[0];
  if (!row) throw new Error("insert returned no row");
  return toEntry(row);
}

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

export async function getEntry(id: string): Promise<LogEntry | null> {
  const rows = await sql<Row[]>`
    select id, title, description,
           to_char(date, 'YYYY-MM-DD') as date,
           image_url, tags, created_at
    from log_entries
    where id = ${id}
  `;
  return rows[0] ? toEntry(rows[0]) : null;
}

/** Full replacement of one entry's editable fields. Returns null if the id is unknown. */
export async function updateEntry(id: string, input: NewLogEntry): Promise<LogEntry | null> {
  const rows = await sql<Row[]>`
    update log_entries set
      title = ${input.title},
      description = ${input.description},
      date = ${input.date}::date,
      image_url = ${input.imageUrl},
      tags = ${input.tags}
    where id = ${id}
    returning id, title, description,
              to_char(date, 'YYYY-MM-DD') as date,
              image_url, tags, created_at
  `;
  return rows[0] ? toEntry(rows[0]) : null;
}

/** Deletes one entry, returning its `image_url` (for attachment cleanup) or null if unknown. */
export async function deleteEntry(id: string): Promise<string | null> {
  const rows = await sql<{ image_url: string }[]>`
    delete from log_entries where id = ${id} returning image_url
  `;
  return rows[0] ? rows[0].image_url : null;
}

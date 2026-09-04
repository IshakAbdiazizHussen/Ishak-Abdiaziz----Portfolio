import { sql } from "./db";
import type { Project, ProjectStat } from "./types";

/**
 * All `projects`/`project_stats` SQL lives here. Queries are parameterized
 * (postgres.js tagged templates); routes never build SQL.
 *
 * `updateStatIfMatches` is the ONE function that implements constraint C18's
 * backend half: it is a single atomic `UPDATE ... WHERE value = $previousValue
 * RETURNING *`, never a separate read followed by a write. Nothing else in
 * this file (or the route) duplicates that check.
 */

interface ProjectRow {
  id: string;
  slug: string;
  name: string;
  lead: boolean;
  stack: string[];
  hook: string;
  what_it_does: string;
  decision: string | null;
  stats_label: string;
  failures_label: string | null;
  failures: string[] | null;
  api_title: string | null;
  api_lines: string[] | null;
  demo_url: string;
  demo_label: string;
  source_url: string;
  sort_order: number;
}

interface StatRow {
  id: string;
  project_id: string;
  label: string;
  value: string;
  note: string | null;
  accent: boolean;
  sort_order: number;
}

function toProject(row: ProjectRow, stats: ProjectStat[]): Project {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    lead: row.lead,
    stack: row.stack,
    hook: row.hook,
    whatItDoes: row.what_it_does,
    decision: row.decision,
    statsLabel: row.stats_label,
    failuresLabel: row.failures_label,
    failures: row.failures,
    apiTitle: row.api_title,
    apiLines: row.api_lines,
    demoUrl: row.demo_url,
    demoLabel: row.demo_label,
    sourceUrl: row.source_url,
    stats,
  };
}

function toStat(row: StatRow): ProjectStat {
  return {
    id: row.id,
    label: row.label,
    value: row.value,
    note: row.note,
    accent: row.accent,
  };
}

async function statsFor(projectId: string): Promise<ProjectStat[]> {
  const rows = await sql<StatRow[]>`
    select * from project_stats where project_id = ${projectId} order by sort_order asc
  `;
  return rows.map(toStat);
}

export async function listProjects(): Promise<Project[]> {
  const projectRows = await sql<ProjectRow[]>`select * from projects order by sort_order asc`;
  const statRows = await sql<StatRow[]>`select * from project_stats order by sort_order asc`;

  const statsByProject = new Map<string, ProjectStat[]>();
  for (const row of statRows) {
    const list = statsByProject.get(row.project_id) ?? [];
    list.push(toStat(row));
    statsByProject.set(row.project_id, list);
  }

  return projectRows.map((row) => toProject(row, statsByProject.get(row.id) ?? []));
}

/** Friendly field name -> DB column, for the dynamic partial UPDATE below. */
const PROJECT_COLUMN_BY_FIELD: Record<string, string> = {
  name: "name",
  lead: "lead",
  stack: "stack",
  hook: "hook",
  whatItDoes: "what_it_does",
  decision: "decision",
  statsLabel: "stats_label",
  failuresLabel: "failures_label",
  failures: "failures",
  apiTitle: "api_title",
  apiLines: "api_lines",
  demoUrl: "demo_url",
  demoLabel: "demo_label",
  sourceUrl: "source_url",
  sortOrder: "sort_order",
};

export interface UpdateProjectFields {
  name?: string;
  lead?: boolean;
  stack?: string[];
  hook?: string;
  whatItDoes?: string;
  decision?: string | null;
  statsLabel?: string;
  failuresLabel?: string | null;
  failures?: string[] | null;
  apiTitle?: string | null;
  apiLines?: string[] | null;
  demoUrl?: string;
  demoLabel?: string;
  sourceUrl?: string;
  sortOrder?: number;
}

/**
 * Update only the given non-stat fields on one project. Returns `null` if the
 * project doesn't exist. `previousValue`/confirm-before-save does NOT apply
 * here — constraint C18 scopes that check to project_stats only.
 */
export async function updateProject(
  id: string,
  fields: UpdateProjectFields,
): Promise<Project | null> {
  const dbFields: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(fields)) {
    const column = PROJECT_COLUMN_BY_FIELD[name];
    if (column) dbFields[column] = value;
  }
  const columns = Object.keys(dbFields);

  if (columns.length > 0) {
    await sql`
      update projects
      set ${sql(dbFields, ...columns)}, updated_at = now()
      where id = ${id}
    `;
  }

  const rows = await sql<ProjectRow[]>`select * from projects where id = ${id}`;
  const row = rows[0];
  if (!row) return null;
  return toProject(row, await statsFor(id));
}

export interface NewProjectFields {
  slug: string;
  name: string;
  lead: boolean;
  stack: string[];
  hook: string;
  whatItDoes: string;
  decision: string | null;
  statsLabel: string;
  failuresLabel: string | null;
  failures: string[] | null;
  apiTitle: string | null;
  apiLines: string[] | null;
  demoUrl: string;
  demoLabel: string;
  sourceUrl: string;
  sortOrder: number;
}

/**
 * Create a project row. The NUMBER of projects on the site is a product
 * constraint enforced by policy (docs/constraints.md C8), not by this
 * function or its route — this only inserts what it's given.
 */
export async function createProject(input: NewProjectFields): Promise<Project> {
  const rows = await sql<ProjectRow[]>`
    insert into projects (
      slug, name, lead, stack, hook, what_it_does, decision, stats_label,
      failures_label, failures, api_title, api_lines, demo_url, demo_label,
      source_url, sort_order
    ) values (
      ${input.slug}, ${input.name}, ${input.lead}, ${input.stack}, ${input.hook},
      ${input.whatItDoes}, ${input.decision}, ${input.statsLabel},
      ${input.failuresLabel}, ${input.failures}, ${input.apiTitle}, ${input.apiLines},
      ${input.demoUrl}, ${input.demoLabel}, ${input.sourceUrl}, ${input.sortOrder}
    )
    returning *
  `;
  const row = rows[0];
  if (!row) throw new Error("insert returned no row");
  return toProject(row, []);
}

export interface StatInput {
  label: string;
  value: string;
  note?: string | null;
  accent?: boolean;
}

/** Add a new stat to a project. Returns `"not_found"` if the project doesn't exist. */
export async function createStat(
  projectId: string,
  input: StatInput,
): Promise<ProjectStat | "not_found"> {
  const project = await sql`select 1 from projects where id = ${projectId}`;
  if (project.length === 0) return "not_found";

  const rows = await sql<StatRow[]>`
    insert into project_stats (project_id, label, value, note, accent, sort_order)
    values (
      ${projectId}, ${input.label}, ${input.value}, ${input.note ?? null},
      ${input.accent ?? false},
      coalesce(
        (select max(sort_order) + 1 from project_stats where project_id = ${projectId}),
        0
      )
    )
    returning *
  `;
  const row = rows[0];
  if (!row) throw new Error("insert returned no row");
  return toStat(row);
}

export type UpdateStatResult =
  | { status: "ok"; stat: ProjectStat }
  | { status: "conflict"; currentValue: string }
  | { status: "not_found" };

/**
 * Constraint C18, enforced. Atomically updates a stat ONLY IF `previousValue`
 * still matches the row's actual current `value` — a single parameterized
 * `UPDATE ... WHERE id = $ AND project_id = $ AND value = $previousValue
 * RETURNING *`. There is no separate "read the value, then write" step, so
 * there is no window in which a concurrent write could slip between the
 * check and the write.
 *
 * If the UPDATE matches zero rows, a follow-up SELECT (which does not affect
 * whether anything was written — that was already decided by the UPDATE)
 * distinguishes "the row doesn't exist / belongs to a different project"
 * (`not_found`) from "the row exists but `previousValue` was stale"
 * (`conflict`, with the row's real current value included so the caller can
 * show it).
 */
export async function updateStatIfMatches(
  projectId: string,
  statId: string,
  previousValue: string,
  input: StatInput,
): Promise<UpdateStatResult> {
  const rows = await sql<StatRow[]>`
    update project_stats
    set label = ${input.label},
        value = ${input.value},
        note = ${input.note ?? null},
        accent = ${input.accent ?? false},
        updated_at = now()
    where id = ${statId}
      and project_id = ${projectId}
      and value = ${previousValue}
    returning *
  `;
  const row = rows[0];
  if (row) {
    return { status: "ok", stat: toStat(row) };
  }

  const existing = await sql<{ value: string }[]>`
    select value from project_stats where id = ${statId} and project_id = ${projectId}
  `;
  const current = existing[0];
  if (!current) return { status: "not_found" };
  return { status: "conflict", currentValue: current.value };
}

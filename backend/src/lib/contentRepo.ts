import { sql } from "./db";

/**
 * All content_blocks SQL lives here. Queries are parameterized; routes never
 * build SQL. Covers Intro, How I Got Here, and Let's Talk — the "simple
 * field" content areas. Built (projects/stats) and Toolbox (groups/items) are
 * structured/repeating and get their own repos (features 14/15), not this
 * generic key-value table — see docs/architecture.md §3.
 */

export const CONTENT_AREAS = ["intro", "how-i-got-here", "lets-talk"] as const;
export type ContentArea = (typeof CONTENT_AREAS)[number];

type FieldColumn = "value" | "image_url";

interface FieldDef {
  /** The content_blocks.key this friendly field name maps to. */
  key: string;
  column: FieldColumn;
}

/**
 * The one place that knows how a friendly field name (what the API and the
 * admin UI use) maps onto a content_blocks row + column. Adding a field to an
 * area means adding one entry here — nothing else hardcodes a key list.
 */
const AREA_FIELDS: Record<ContentArea, Record<string, FieldDef>> = {
  intro: {
    headline: { key: "intro.headline", column: "value" },
    subheadline: { key: "intro.subheadline", column: "value" },
    heroPhotoUrl: { key: "intro.hero_photo_url", column: "image_url" },
  },
  "how-i-got-here": {
    body: { key: "how_i_got_here.body", column: "value" },
    photoUrl: { key: "how_i_got_here.photo_url", column: "image_url" },
  },
  "lets-talk": {
    email: { key: "lets_talk.email", column: "value" },
    githubUrl: { key: "lets_talk.github_url", column: "value" },
    linkedinUrl: { key: "lets_talk.linkedin_url", column: "value" },
  },
};

/** The content_blocks keys that belong to one area. Derived, not hand-kept in sync. */
export const AREA_KEYS: Record<ContentArea, string[]> = Object.fromEntries(
  (Object.keys(AREA_FIELDS) as ContentArea[]).map((area) => [
    area,
    Object.values(AREA_FIELDS[area]).map((f) => f.key),
  ]),
) as Record<ContentArea, string[]>;

/** The friendly field names an area accepts on a write — used for validation. */
export function areaFieldNames(area: ContentArea): string[] {
  return Object.keys(AREA_FIELDS[area]);
}

interface Row {
  key: string;
  value: string;
  image_url: string | null;
}

/** Read every known field for one area, keyed by its friendly field name. */
export async function getArea(area: ContentArea): Promise<Record<string, string>> {
  const fields = AREA_FIELDS[area];
  const keys = AREA_KEYS[area];

  const rows = await sql<Row[]>`
    select key, value, image_url from content_blocks where key = any(${keys})
  `;
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const result: Record<string, string> = {};
  for (const [fieldName, def] of Object.entries(fields)) {
    const row = byKey.get(def.key);
    if (!row) {
      result[fieldName] = "";
      continue;
    }
    result[fieldName] = def.column === "image_url" ? (row.image_url ?? "") : row.value;
  }
  return result;
}

/**
 * Write only the given fields for one area, then return the area's full,
 * current set of fields. Callers must have already validated `fields` against
 * that area's known field names (see `areaFieldNames`) — this function trusts
 * every key it's given belongs to the area and writes it.
 */
export async function updateArea(
  area: ContentArea,
  fields: Record<string, string>,
): Promise<Record<string, string>> {
  const def = AREA_FIELDS[area];
  const entries = Object.entries(fields).filter(([name]) => name in def);

  if (entries.length > 0) {
    await sql.begin(async (tx) => {
      for (const [fieldName, raw] of entries) {
        const fieldDef = def[fieldName];
        if (!fieldDef) continue;
        const { key, column } = fieldDef;
        if (column === "image_url") {
          await tx`
            insert into content_blocks (key, value, image_url)
            values (${key}, '', ${raw})
            on conflict (key) do update
              set image_url = excluded.image_url, updated_at = now()
          `;
        } else {
          await tx`
            insert into content_blocks (key, value)
            values (${key}, ${raw})
            on conflict (key) do update
              set value = excluded.value, updated_at = now()
          `;
        }
      }
    });
  }

  return getArea(area);
}

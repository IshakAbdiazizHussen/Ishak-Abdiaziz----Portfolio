import { z } from "zod";
import { config } from "../config";

/** True if `host` equals an allowed host or is a subdomain of one. */
export function isAllowedImageHost(host: string): boolean {
  return config.BLOB_ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

const httpsAllowlistedUrl = z
  .string()
  .url()
  .refine((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    return url.protocol === "https:" && isAllowedImageHost(url.host);
  }, "imageUrl must be an https URL on an allowed storage host");

const tag = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,29}$/, "tags must be short slugs");

/**
 * Body schema for `POST /api/log`. Text is stored verbatim (as plain text) and
 * escaped by the frontend on render — never treated as HTML here.
 */
export const newLogEntrySchema = z.object({
  title: z.string().trim().min(1, "title is required").max(120),
  description: z.string().trim().min(1, "description is required").max(2000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .refine((d) => {
      const t = Date.parse(`${d}T00:00:00Z`);
      if (Number.isNaN(t)) return false;
      // allow up to ~36h ahead to be timezone-forgiving; reject anything further
      return t <= Date.now() + 36 * 60 * 60 * 1000;
    }, "date is invalid or too far in the future"),
  imageUrl: httpsAllowlistedUrl,
  tags: z.array(tag).max(8, "at most 8 tags").default([]),
});

export type NewLogEntryInput = z.infer<typeof newLogEntrySchema>;

/**
 * Body schemas for `PUT /api/content/:area` (feature 13). Same discipline as
 * `newLogEntrySchema`: every field is required/trimmed/length-capped, text is
 * stored verbatim and escaped by the frontend on render, and image URLs are
 * checked the same way `POST /api/log`'s `imageUrl` is. `.partial()` because a
 * PUT may update a subset of an area's fields; `.refine` rejects an empty body
 * rather than silently no-op-ing.
 */
const contentText = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max);

/** An https URL on the blob-storage allowlist, or the empty string (unset). */
const optionalStoredImageUrl = z.union([z.literal(""), httpsAllowlistedUrl]);

/**
 * An arbitrary https URL (GitHub/LinkedIn profile links, project demo/source
 * links — not blob storage, so `isAllowedImageHost` does not apply here).
 */
export const httpsUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "must be an https URL");

export const introContentSchema = z
  .object({
    headline: contentText(200, "headline"),
    subheadline: contentText(600, "subheadline"),
    heroPhotoUrl: optionalStoredImageUrl,
  })
  .strict("unrecognized field")
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

export const howIGotHereContentSchema = z
  .object({
    body: contentText(4000, "body"),
    photoUrl: optionalStoredImageUrl,
  })
  .strict("unrecognized field")
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

export const letsTalkContentSchema = z
  .object({
    email: z.string().trim().email("a valid email is required").max(200),
    githubUrl: httpsUrl,
    linkedinUrl: httpsUrl,
  })
  .strict("unrecognized field")
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

/** One schema per content area, keyed the same way the route params are. */
export const CONTENT_AREA_SCHEMAS = {
  intro: introContentSchema,
  "how-i-got-here": howIGotHereContentSchema,
  "lets-talk": letsTalkContentSchema,
} as const;

/**
 * Body schemas for the projects/project_stats API (feature 14). Same
 * discipline as the other feature schemas: required/length-capped text,
 * `.strict()` so an unknown key is a hard rejection (not silently dropped),
 * and `demoUrl`/`sourceUrl` reuse `httpsUrl` — these point at deployed apps
 * and GitHub repos, not blob storage, so `httpsAllowlistedUrl` does not apply
 * here.
 *
 * `value` on a stat is always treated as an opaque display string — never
 * parsed as a number, reformatted, or rounded (constraint C11).
 */
export const uuidParam = z.string().uuid();

const shortText = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max);

const stackArray = z.array(z.string().trim().min(1).max(40)).max(12, "at most 12 stack items");

const statLabel = shortText(60, "label");
const statValue = shortText(120, "value");
/** An optional annotation shown next to a stat (e.g. "deer — weakest class"). */
const statNote = z.string().trim().max(200).nullable().optional();
const statAccent = z.boolean().optional();

const apiLines = z.array(z.string().trim().max(200)).max(20, "at most 20 lines").nullable();

export const updateProjectSchema = z
  .object({
    name: shortText(120, "name"),
    lead: z.boolean(),
    stack: stackArray,
    hook: shortText(400, "hook"),
    whatItDoes: shortText(1000, "whatItDoes"),
    decision: z.string().trim().max(2000).nullable(),
    statsLabel: shortText(80, "statsLabel"),
    failuresLabel: z.string().trim().max(80).nullable(),
    failures: z.array(z.string().trim().max(300)).max(10, "at most 10 failures").nullable(),
    apiTitle: z.string().trim().max(80).nullable(),
    apiLines,
    demoUrl: httpsUrl,
    demoLabel: shortText(40, "demoLabel"),
    sourceUrl: httpsUrl,
    sortOrder: z.number().int().min(0).max(1000),
  })
  .strict("unrecognized field")
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

export const newProjectSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]{0,59}$/, "slug must be a short lowercase-and-hyphens slug"),
    name: shortText(120, "name"),
    lead: z.boolean().default(false),
    stack: stackArray.default([]),
    hook: shortText(400, "hook"),
    whatItDoes: shortText(1000, "whatItDoes"),
    decision: z.string().trim().max(2000).nullable().default(null),
    statsLabel: shortText(80, "statsLabel"),
    failuresLabel: z.string().trim().max(80).nullable().default(null),
    failures: z
      .array(z.string().trim().max(300))
      .max(10, "at most 10 failures")
      .nullable()
      .default(null),
    apiTitle: z.string().trim().max(80).nullable().default(null),
    apiLines: apiLines.default(null),
    demoUrl: httpsUrl,
    demoLabel: shortText(40, "demoLabel").default("Try it live"),
    sourceUrl: httpsUrl,
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .strict("unrecognized field");

/**
 * POST /api/projects/:id/stats — a brand-new stat row. `previousValue` must
 * be absent or `null`: there is nothing yet stored to confirm against
 * (constraint C18).
 */
export const newProjectStatSchema = z
  .object({
    label: statLabel,
    value: statValue,
    note: statNote,
    accent: statAccent,
    previousValue: z.literal(null).optional(),
  })
  .strict("unrecognized field");

/**
 * PUT /api/projects/:id/stats/:statId — constraint C18. `previousValue` is
 * REQUIRED here; the route/repo compares it against the row's actual current
 * `value` atomically and rejects the write with 409 on a mismatch. This
 * schema only checks the field is present and shaped like a stat value — the
 * actual concurrency check happens in `projectsRepo.updateStatIfMatches`, not
 * here.
 */
export const updateProjectStatSchema = z
  .object({
    previousValue: statValue,
    label: statLabel,
    value: statValue,
    note: statNote,
    accent: statAccent,
  })
  .strict("unrecognized field");

/**
 * Body schemas for the toolbox_groups/toolbox_items API (feature 15). Same
 * discipline as the Log/content/projects schemas: required/length-capped
 * text, `.strict()` so an unknown key is a hard rejection. Deliberately has
 * NO `previousValue`/confirm-before-save field anywhere — that mechanism is
 * specific to constraint C18 (Built project stats) and does not apply to
 * Toolbox, which is a curated list, not a factual/verifiable claim.
 */
const toolboxSortOrder = z.number().int().min(0).max(1000);
const toolboxName = shortText(60, "name");
const toolboxNote = z.string().trim().max(200).nullable().optional();

export const newToolboxGroupSchema = z
  .object({
    name: toolboxName,
    sortOrder: toolboxSortOrder.optional(),
  })
  .strict("unrecognized field");

export const updateToolboxGroupSchema = z
  .object({
    name: toolboxName,
    sortOrder: toolboxSortOrder,
  })
  .strict("unrecognized field")
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

export const newToolboxItemSchema = z
  .object({
    name: toolboxName,
    note: toolboxNote,
    sortOrder: toolboxSortOrder.optional(),
  })
  .strict("unrecognized field");

/** `groupId`, if present, moves the item to a different (existing) group. */
export const updateToolboxItemSchema = z
  .object({
    name: toolboxName,
    note: toolboxNote,
    sortOrder: toolboxSortOrder,
    groupId: z.string().uuid(),
  })
  .strict("unrecognized field")
  .partial()
  .refine((v) => Object.keys(v).length > 0, "at least one field is required");

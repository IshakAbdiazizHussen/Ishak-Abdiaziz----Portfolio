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

/** An arbitrary https URL (GitHub/LinkedIn profile links — not blob storage). */
const httpsUrl = z
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

import "dotenv/config";
import { z } from "zod";

/**
 * Central typed configuration. This is the ONLY place `process.env` is read.
 *
 * `dotenv/config` loads a local `.env` if present (it never overrides real
 * environment variables, so it is a safe no-op on Railway).
 *
 * Fail-fast policy: if a required variable is missing or malformed, the process
 * prints the problems and exits non-zero — it must not start in a broken state.
 *
 * NOT fail-fast: a present-but-currently-unreachable Postgres/Redis. Those are
 * connection concerns handled by the clients (with retry) and reported by
 * `GET /health`, so a transient provider blip during a deploy does not take the
 * service down.
 */

const csv = z
  .string()
  .min(1)
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Reverse-proxy hop count for req.ip. Default 0 = trust nothing (correct for
  // local dev — req.ip is the socket address, X-Forwarded-For ignored). Railway
  // terminates at exactly 1 proxy, so set 1 there. Never a value that makes
  // Express `trust proxy` === true (fully spoofable).
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),

  // --- Data stores (required) ---
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // --- Admin auth (required) ---
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),
  // Shared parent domain for the sid cookie (e.g. ".ishak.dev"). Unset locally.
  COOKIE_DOMAIN: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),

  // --- CORS (required) ---
  CORS_ALLOWED_ORIGINS: csv,
  // Optional: allow Vercel preview URLs through CORS for the PUBLIC endpoints.
  // Must be a valid, tightly-anchored regex. Leave unset in the simple setup.
  CORS_PREVIEW_ORIGIN_REGEX: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => {
        if (!v) return true;
        try {
          new RegExp(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: "CORS_PREVIEW_ORIGIN_REGEX must be a valid regular expression" },
    ),

  // --- Log-list cache ---
  LOG_CACHE_TTL_SECONDS: z.coerce.number().int().positive().max(600).default(45),

  // --- File storage ---
  // A real Vercel Blob token selects the "blob" driver. Empty — or the historic
  // "vercel_blob_rw_DUMMYTOKEN" placeholder — falls back to the "local" driver,
  // which writes uploads under backend/uploads/ and serves them at /uploads.
  // Fine for local development; a deployed instance needs the Blob token
  // (local disk is ephemeral on most hosts).
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v !== "vercel_blob_rw_DUMMYTOKEN" ? v : undefined)),
  // Public origin this backend is reachable at — used to build URLs for
  // locally-stored uploads. Defaults to http://localhost:<PORT>.
  PUBLIC_BASE_URL: z
    .string()
    .url()
    .optional()
    .transform((v) => (v ? v.replace(/\/+$/, "") : undefined)),
  // Hosts allowed in a stored image_url. A bare host also matches its subdomains
  // (Vercel Blob serves from <id>.public.blob.vercel-storage.com).
  BLOB_ALLOWED_HOSTS: csv.default("blob.vercel-storage.com"),

  // --- Email / contact form (required) ---
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  CONTACT_TO_EMAIL: z.string().email(),
  CONTACT_FROM_EMAIL: z.string().email(),
});

export type Config = z.infer<typeof schema>;

function load(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid backend environment configuration:");
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "(root)";
      // eslint-disable-next-line no-console
      console.error(`  - ${path}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const config: Config = load();

export const isProd = config.NODE_ENV === "production";
export const isTest = config.NODE_ENV === "test";

/** "blob" when a real Vercel Blob token is set, otherwise the local-disk driver. */
export const storageDriver: "blob" | "local" = config.BLOB_READ_WRITE_TOKEN ? "blob" : "local";

/** Origin used to build public URLs for locally-stored uploads. */
export const publicBaseUrl = config.PUBLIC_BASE_URL ?? `http://localhost:${config.PORT}`;

if (isProd && storageDriver === "local") {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] BLOB_READ_WRITE_TOKEN is not set — uploads will be written to local disk, " +
      "which is ephemeral on most hosts. Set a Vercel Blob token for production.",
  );
}

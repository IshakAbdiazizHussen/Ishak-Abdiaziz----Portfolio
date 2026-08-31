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

  // Reverse-proxy hop count for req.ip. Railway terminates at 1. Never "true".
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),

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

  // --- Email / contact form (feature 4 — optional until wired) ---
  RESEND_API_KEY: z.string().optional(),
  CONTACT_TO_EMAIL: z.string().email().optional(),
  CONTACT_FROM_EMAIL: z.string().email().optional(),
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

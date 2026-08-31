/**
 * Public runtime configuration. The frontend holds NO secrets (constraint C3) —
 * only `NEXT_PUBLIC_*` values that are safe to ship in the browser bundle.
 */

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!RAW_BACKEND_URL && process.env.NODE_ENV !== "test") {
  throw new Error(
    "NEXT_PUBLIC_BACKEND_URL is not set. Copy frontend/.env.example to " +
      "frontend/.env.local and set it (local: http://localhost:4000).",
  );
}

const stripTrailingSlash = (v: string) => v.replace(/\/+$/, "");

export const env = {
  /** Base URL of the backend REST API. No trailing slash. */
  backendUrl: stripTrailingSlash(RAW_BACKEND_URL ?? ""),
  /** This site's own canonical URL, for metadata / OG / sitemap. May be undefined. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    ? stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
} as const;

/**
 * Public runtime configuration. The frontend holds NO secrets (constraint C3).
 *
 * The backend's URL is NOT here any more: it is `BACKEND_URL`, a server-only
 * env var read directly in `lib/backend.ts` (server branch) and
 * `next.config.ts` (the rewrite + CSP). The browser never needs it — client
 * calls go through the same-origin `/api/backend/*` proxy.
 */

const stripTrailingSlash = (v: string) => v.replace(/\/+$/, "");

export const env = {
  /** This site's own canonical URL, for metadata / OG / sitemap. May be undefined. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    ? stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
} as const;

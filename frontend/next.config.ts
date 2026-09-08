import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * The backend's URL — SERVER-ONLY (no NEXT_PUBLIC_ prefix). Used here for the
 * same-origin proxy rewrite and the CSP, both of which run server-side (build +
 * Vercel edge). It is NEVER sent to the browser: client code calls the
 * same-origin `/api/backend/*` path instead. See `lib/backend.ts` and
 * `docs/architecture.md` §13.
 */
const backendUrl = (process.env.BACKEND_URL ?? "").replace(/\/+$/, "");

/**
 * Content-Security-Policy.
 *
 * `script-src` includes `'unsafe-inline'` because Next.js App Router injects an
 * inline bootstrap/hydration `<script>` even in statically-rendered pages
 * (verified in the build output), and the nonce alternative forces per-request
 * rendering — which would break the static-first requirement (constraint C6).
 *
 * `connect-src` is just `'self'` now: every browser call to the backend goes
 * through the same-origin `/api/backend/*` rewrite, so there is no cross-origin
 * XHR to allow. `img-src` still lists the backend origin for the local storage
 * driver's `/uploads/...` image URLs in development (production images are on
 * Vercel Blob). In dev only, `'unsafe-eval'` and `ws:`/`wss:` are added for
 * Turbopack HMR.
 */
function buildCsp(isDev: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `img-src 'self' data: https://*.blob.vercel-storage.com ${backendUrl}`.trim(),
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "upgrade-insecure-requests",
  ].join("; ");
}

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    poweredByHeader: false,
    // Don't auto-generate AGENTS.md / CLAUDE.md — repo conventions live in ../docs.
    agentRules: false,
    // Pin the workspace root so Turbopack doesn't walk up to an unrelated lockfile.
    turbopack: { root: projectRoot },
    // Log entry images live in Vercel Blob. (Swap for your Cloudinary host if
    // you use that instead — must also match the CSP img-src in buildCsp.)
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
        { protocol: "https", hostname: "*.blob.vercel-storage.com", pathname: "/**" },
      ],
    },
    /**
     * Same-origin reverse proxy for the backend API. Every browser-side call
     * hits `/api/backend/*` on the frontend's own origin; Vercel rewrites it
     * server-side to the real backend. This makes the admin session cookie a
     * first-party `SameSite=Lax` cookie (constraint C4b) with no custom domain
     * and no CORS. Server-side code (ISR / SSR) skips this and calls
     * `BACKEND_URL` directly — see `lib/backend.ts`.
     *
     * This is a Next.js config-level rewrite, NOT a Route Handler / API route
     * (constraint C1/C3 forbids those, and this isn't one — no `app/api/`
     * directory, no request code runs in the frontend).
     */
    async rewrites() {
      if (!backendUrl) {
        throw new Error(
          "BACKEND_URL is not set — the /api/backend/* proxy cannot be built. " +
            "Set it (server-only, no NEXT_PUBLIC_ prefix) in frontend/.env.local " +
            "and in the frontend's Vercel project.",
        );
      }
      return [
        {
          source: "/api/backend/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: buildCsp(isDev) },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
            },
          ],
        },
      ];
    },
  };
}

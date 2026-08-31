import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

/**
 * Content-Security-Policy.
 *
 * `script-src` includes `'unsafe-inline'` because Next.js App Router injects an
 * inline bootstrap/hydration `<script>` even in statically-rendered pages
 * (verified in the build output), and the nonce alternative forces per-request
 * rendering — which would break the static-first requirement (constraint C6).
 * Everything else is locked down: `object-src 'none'`, `frame-ancestors 'none'`,
 * `base-uri 'self'`, an explicit `img-src` allowlist, and `connect-src` limited
 * to self + the backend. Fonts are self-hosted by `next/font` (no Google CDN).
 *
 * In dev only, `'unsafe-eval'` and `ws:`/`wss:` are added for Turbopack HMR.
 */
function buildCsp(isDev: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: https://*.blob.vercel-storage.com",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${backendUrl}${isDev ? " ws: wss:" : ""}`.trim(),
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

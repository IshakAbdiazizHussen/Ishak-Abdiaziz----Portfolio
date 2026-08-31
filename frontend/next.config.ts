import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Don't auto-generate AGENTS.md / CLAUDE.md — repo conventions live in ../docs.
  agentRules: false,
  // Pin the workspace root so Turbopack doesn't walk up to an unrelated
  // lockfile outside the repo.
  turbopack: { root: projectRoot },
  // Security headers, image remotePatterns (blob host), and CSP are added in
  // feature 6 (design system & app shell) / feature 9 (Log page).
};

export default nextConfig;

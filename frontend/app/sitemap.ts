import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

const ROUTES = ["", "/built", "/how-i-got-here", "/toolbox", "/log", "/lets-talk"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl ?? "http://localhost:3000";
  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified,
    changeFrequency: route === "/log" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}

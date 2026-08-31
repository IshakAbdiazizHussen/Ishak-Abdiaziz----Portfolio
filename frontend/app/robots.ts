import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin/",
    },
    ...(env.siteUrl ? { sitemap: `${env.siteUrl}/sitemap.xml`, host: env.siteUrl } : {}),
  };
}

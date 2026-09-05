import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

const DESCRIPTION =
  "Software and AI Engineer. I ship full, working products and have real ML depth — " +
  "trained models, serving infrastructure, failure-mode design, and measured results.";

export const metadata: Metadata = {
  ...(env.siteUrl ? { metadataBase: new URL(env.siteUrl) } : {}),
  title: {
    default: "Ishak Abdiaziz — Software & AI Engineer",
    template: "%s — Ishak Abdiaziz",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    title: "Ishak Abdiaziz — Software & AI Engineer",
    description: DESCRIPTION,
    ...(env.siteUrl ? { url: env.siteUrl } : {}),
  },
};

// Runs before first paint so the stored theme is applied with no flash.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

/**
 * Root layout: html/body, fonts and the pre-paint theme script only — the
 * providers every route needs. The public header/footer chrome lives in
 * `app/(site)/layout.tsx` so it is never rendered on `/admin`, which brings
 * its own shell in `app/admin/layout.tsx`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Nav />
        <main id="main" className="site-main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

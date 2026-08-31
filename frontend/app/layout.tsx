import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  ...(env.siteUrl ? { metadataBase: new URL(env.siteUrl) } : {}),
  title: {
    default: "Ishak Abdiaziz — Software & AI Engineer",
    template: "%s — Ishak Abdiaziz",
  },
  description:
    "Software and AI Engineer. I ship full, working products and have real ML depth — " +
    "trained models, serving infrastructure, failure-mode design, and measured results.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

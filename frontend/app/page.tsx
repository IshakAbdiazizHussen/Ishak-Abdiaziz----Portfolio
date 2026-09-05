import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { NextTeaser } from "@/components/NextTeaser";
import { intro } from "@/content/intro";
import { fetchIntro } from "@/lib/content";

export const metadata: Metadata = {
  description: intro.subheadline,
  openGraph: {
    title: "Ishak Abdiaziz — Software & AI Engineer",
    description: intro.subheadline,
  },
};

export default async function Home() {
  // Feature 18: subheadline + hero photo are backend-fetched. `intro.subheadline`
  // is the fallback if the backend/DB is unreachable — the page must never look
  // broken; kicker, the 3-line headline, CTAs, marquee, and hero stats stay
  // hardcoded (not part of the Intro content-area schema — see lib/content.ts).
  let subheadline: string = intro.subheadline;
  let heroPhotoUrl = "";
  try {
    const content = await fetchIntro();
    subheadline = content.subheadline;
    heroPhotoUrl = content.heroPhotoUrl;
  } catch {
    // Backend/DB unreachable — keep the hardcoded fallback above.
  }

  return (
    <>
      {/* Hero manages its own (wider) width so the copy and portrait both have room. */}
      <Hero subheadline={subheadline} heroPhotoUrl={heroPhotoUrl} />
      <Marquee label={intro.stackLabel} items={intro.marquee} />
      <NextTeaser />
    </>
  );
}

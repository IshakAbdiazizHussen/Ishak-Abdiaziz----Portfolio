import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { MonoLabel } from "@/components/MonoLabel";
import { intro } from "@/content/intro";

export const metadata: Metadata = {
  description: intro.subheadline,
  openGraph: {
    title: "Ishak Abdiaziz — Software & AI Engineer",
    description: intro.subheadline,
  },
};

export default function Home() {
  return (
    <Container>
      <Hero />
      <MonoLabel as="div">{"// stack"}</MonoLabel>
      <Marquee items={intro.marquee} />
    </Container>
  );
}

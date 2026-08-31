import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";
import { about } from "@/content/about";

export const metadata: Metadata = {
  title: "How I Got Here",
  description: "A short, human background — how I ended up building AI systems.",
};

export default function HowIGotHerePage() {
  return (
    <Container size="prose">
      <PageHeader kicker="How I Got Here" title="How I Got Here" intro={about.intro} />
      <Prose>
        {about.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </Prose>
    </Container>
  );
}

import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "How I Got Here" };

export default function HowIGotHerePage() {
  return (
    <Container>
      <PageHeader
        kicker="How I Got Here"
        title="How I Got Here"
        intro="A short, human background — not a resume."
      />
      <Prose>
        <p>Placeholder. This page is built in feature 7.</p>
      </Prose>
    </Container>
  );
}

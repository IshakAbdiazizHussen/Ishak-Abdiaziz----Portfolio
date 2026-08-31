import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Let's Talk" };

export default function LetsTalkPage() {
  return (
    <Container>
      <PageHeader
        kicker="Let's Talk"
        title="Let's Talk"
        intro="Email, GitHub, LinkedIn, and a short contact form."
      />
      <Prose>
        <p>Placeholder. The contact form (wired to the backend) is built in feature 8.</p>
      </Prose>
    </Container>
  );
}

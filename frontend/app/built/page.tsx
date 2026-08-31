import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Built" };

export default function BuiltPage() {
  return (
    <Container>
      <PageHeader
        kicker="Built"
        title="Built"
        intro="Two deployed projects, each told as one hard technical decision."
      />
      <Prose>
        <p>Placeholder. This page is built in feature 7.</p>
      </Prose>
    </Container>
  );
}

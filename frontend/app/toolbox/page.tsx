import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Toolbox" };

export default function ToolboxPage() {
  return (
    <Container>
      <PageHeader
        kicker="Toolbox"
        title="Toolbox"
        intro="An honest, grouped list of what I actually use."
      />
      <Prose>
        <p>Placeholder. This page is built in feature 7.</p>
      </Prose>
    </Container>
  );
}

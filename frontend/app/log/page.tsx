import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Log" };

export default function LogPage() {
  return (
    <Container>
      <PageHeader
        kicker="Log"
        title="Log"
        intro="A reverse-chronological feed of things shipped, learned, and achieved."
      />
      <Prose>
        <p>Placeholder. The public feed (fetched from the backend) is built in feature 9.</p>
      </Prose>
    </Container>
  );
}

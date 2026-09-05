import Link from "next/link";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export default function NotFound() {
  return (
    <Container>
      <PageHeader kicker="404" title="Page not found" intro="That route doesn't exist." />
      <Prose>
        <p>
          <Link href="/" className="inline-link">
            ← Back to Intro
          </Link>
        </p>
      </Prose>
    </Container>
  );
}

import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { Prose } from "@/components/Prose";

export default function Home() {
  return (
    <Container>
      <PageHeader
        kicker="Intro"
        title="I build AI systems, then try to break them before anyone else does."
        intro="Software and AI Engineer — full, working products and real ML depth."
      />
      <Prose>
        <p>
          Placeholder. The hero (photo, headline, animated tech-stack marquee) is built in feature
          7.
        </p>
      </Prose>
    </Container>
  );
}

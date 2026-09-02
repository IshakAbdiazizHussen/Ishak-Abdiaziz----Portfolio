import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { Prose } from "@/components/Prose";
import { about } from "@/content/about";
import styles from "./how-i-got-here.module.css";

export const metadata: Metadata = {
  title: "How I Got Here",
  description: "A short, human background — how I ended up building AI systems.",
};

export default function HowIGotHerePage() {
  return (
    <>
      <Container size="prose">
        <header className={styles.header}>
          <p className={styles.kicker}>{about.header.kicker}</p>
          <h1 className={styles.title}>
            {about.header.titleLines.map((line) => (
              <span key={line} className={styles.line}>
                {line}
              </span>
            ))}
          </h1>
        </header>
        <Prose>
          {about.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </Prose>
      </Container>
      <Container>
        <dl className={styles.facts}>
          {about.facts.map((fact) => (
            <div key={fact.label} className={styles.fact}>
              <dt className={styles.factLabel}>{fact.label}</dt>
              <dd className={styles.factBody}>{fact.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </>
  );
}

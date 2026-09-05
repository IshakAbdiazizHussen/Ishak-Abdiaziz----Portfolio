import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { Prose } from "@/components/Prose";
import { about } from "@/content/about";
import { fetchHowIGotHere } from "@/lib/content";
import styles from "./how-i-got-here.module.css";

export const metadata: Metadata = {
  title: "How I Got Here",
  description: "A short, human background — how I ended up building AI systems.",
};

export default async function HowIGotHerePage() {
  // Feature 18: the body paragraphs are backend-fetched (split back into an
  // array — see lib/content.ts). `about.paragraphs` is the fallback if the
  // backend/DB is unreachable — the page must never look broken. The header
  // (kicker/title lines) and the facts strip are page chrome, not part of
  // the how-i-got-here content-area schema, and stay hardcoded either way.
  // The photo field exists on the backend but has no rendered slot on this
  // page today (there wasn't one before feature 18 either) — not wired here
  // to avoid adding new markup this feature didn't ask for.
  let paragraphs: readonly string[] = about.paragraphs;
  try {
    const content = await fetchHowIGotHere();
    if (content.paragraphs.length > 0) paragraphs = content.paragraphs;
  } catch {
    // Backend/DB unreachable — keep the hardcoded fallback above.
  }

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
          {paragraphs.map((paragraph, i) => (
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

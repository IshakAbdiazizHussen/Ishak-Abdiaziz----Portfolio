import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { MonoLabel } from "@/components/MonoLabel";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/content/site";
import styles from "./lets-talk.module.css";

export const metadata: Metadata = {
  title: "Let's Talk",
  description: "Get in touch — email, GitHub, LinkedIn, or a short message.",
};

export default function LetsTalkPage() {
  return (
    <Container>
      <header className={styles.header}>
        <p className={styles.kicker}>Let&apos;s talk</p>
        <h1 className={styles.title}>
          <span className={styles.line}>Open to engineering</span>
          <span className={styles.line}>roles and contract work</span>
        </h1>
        <p className={styles.sub}>
          Happy to walk through either project&apos;s code or evaluation in
          <br />
          detail. Direct email is fastest.
        </p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.direct}>
          <MonoLabel as="div">Direct</MonoLabel>
          <ul className={styles.links}>
            <li>
              <a href={`mailto:${site.email}`} className="inline-link">
                {site.email}
              </a>
            </li>
            <li>
              <a
                href={site.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-link"
              >
                GitHub ↗
              </a>
            </li>
            <li>
              <a
                href={site.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-link"
              >
                LinkedIn ↗
              </a>
            </li>
          </ul>
        </aside>

        <div className={styles.formWrap}>
          <ContactForm />
        </div>
      </div>
    </Container>
  );
}

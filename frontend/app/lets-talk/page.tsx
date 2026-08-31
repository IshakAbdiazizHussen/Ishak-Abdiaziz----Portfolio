import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader
        kicker="Let's Talk"
        title="Let's Talk"
        intro="Hiring for a role, or want to dig into one of the projects? Send a note."
      />
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

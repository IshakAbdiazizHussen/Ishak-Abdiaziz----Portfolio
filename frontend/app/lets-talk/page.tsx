import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/content/site";
import styles from "./lets-talk.module.css";

const strip = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const directLinks = [
  { label: "Email", href: `mailto:${site.email}`, display: site.email, external: false },
  { label: "GitHub", href: site.github, display: strip(site.github), external: true },
  {
    label: "LinkedIn",
    href: site.linkedin,
    display: strip(site.linkedin).replace(/^linkedin\.com\//, ""),
    external: true,
  },
];

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
        <dl className={styles.direct}>
          {directLinks.map((link) => (
            <div key={link.label} className={styles.row}>
              <dt className={styles.rowLabel}>{link.label}</dt>
              <dd className={styles.rowValue}>
                <a
                  href={link.href}
                  className={styles.rowLink}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.display}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <div className={styles.formWrap}>
          <ContactForm />
        </div>
      </div>
    </Container>
  );
}

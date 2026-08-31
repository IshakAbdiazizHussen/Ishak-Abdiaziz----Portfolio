import { site } from "@/content/site";
import { Container } from "./Container";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.inner}>
          <span className={styles.name}>
            {site.name} — {site.role}
          </span>
          <nav className={styles.links} aria-label="Elsewhere">
            <a href={`mailto:${site.email}`}>Email</a>
            <a href={site.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </nav>
          <span className={styles.year}>© {new Date().getFullYear()}</span>
        </div>
      </Container>
    </footer>
  );
}

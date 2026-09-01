import Link from "next/link";
import { intro } from "@/content/intro";
import styles from "./NextTeaser.module.css";

/** "What's next" transition block at the foot of the Intro page → Built. */
export function NextTeaser() {
  return (
    <section className={styles.section}>
      <Link
        href={intro.next.href}
        className={styles.inner}
        aria-label={`${intro.next.title} — Built`}
      >
        <div className={styles.body}>
          <p className={styles.kicker}>{intro.next.kicker}</p>
          <h2 className={styles.title}>{intro.next.title}</h2>
          <p className={styles.sub}>{intro.next.sub}</p>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v15M6 13l6 6 6-6" />
          </svg>
        </span>
      </Link>
    </section>
  );
}

import Link from "next/link";
import { intro } from "@/content/intro";
import styles from "./NextTeaser.module.css";

/** "What's next" transition block at the foot of a page. Defaults to the
 *  Intro → Built hand-off; pass props to reuse it elsewhere. */
export function NextTeaser({
  href = intro.next.href,
  kicker = intro.next.kicker,
  title = intro.next.title,
  sub = intro.next.sub as string | undefined,
  arrow = "down",
  context = "Built",
}: {
  href?: string;
  kicker?: string;
  title?: string;
  sub?: string;
  arrow?: "down" | "right";
  context?: string;
} = {}) {
  return (
    <section className={styles.section}>
      <div className={styles.wrap}>
        <Link href={href} className={styles.inner} aria-label={`${title} — ${context}`}>
          <div className={styles.body}>
            <p className={styles.kicker}>{kicker}</p>
            <h2 className={styles.title}>{title}</h2>
            {sub ? <p className={styles.sub}>{sub}</p> : null}
          </div>
          <span
            className={[styles.arrow, arrow === "right" ? styles.arrowRight : ""]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
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
              {arrow === "right" ? (
                <path d="M4 12h15M13 6l6 6-6 6" />
              ) : (
                <path d="M12 4v15M6 13l6 6 6-6" />
              )}
            </svg>
          </span>
        </Link>
      </div>
    </section>
  );
}

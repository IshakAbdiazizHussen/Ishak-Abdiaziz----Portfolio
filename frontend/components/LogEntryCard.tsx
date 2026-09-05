import Image from "next/image";
import type { LogEntry } from "@/lib/types";
import { Reveal } from "./Reveal";
import styles from "./LogEntryCard.module.css";

/**
 * `next/image` only accepts the Vercel Blob hosts allowed in next.config.ts —
 * anything else (empty, an example URL, a dead link) falls back to the hatch
 * placeholder rather than rendering a broken image.
 */
function isStoredFile(url: string): boolean {
  try {
    return /\.blob\.vercel-storage\.com$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** A stored attachment can be a PDF (plots/reports) rather than an image. */
function isPdf(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

/**
 * Presentational. `entry.description` is rendered as plain text by React's
 * default escaping — never as HTML (constraint C9).
 */
export function LogEntryCard({ entry }: { entry: LogEntry }) {
  return (
    <Reveal>
      <article className={styles.card}>
        <div className={styles.media}>
          {!isStoredFile(entry.imageUrl) ? (
            <span className={styles.placeholder}>Image</span>
          ) : isPdf(entry.imageUrl) ? (
            <a
              href={entry.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.pdf}
            >
              <span className={styles.pdfLabel}>PDF</span>
              <span className={styles.pdfHint}>Open ↗</span>
            </a>
          ) : (
            <Image
              src={entry.imageUrl}
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 15rem"
              className={styles.image}
            />
          )}
        </div>
        <div className={styles.body}>
          <div className={styles.head}>
            <h3 className={styles.title}>{entry.title}</h3>
            <time className={styles.date} dateTime={entry.date}>
              {entry.date}
            </time>
          </div>
          <p className={styles.description}>{entry.description}</p>
        </div>
      </article>
    </Reveal>
  );
}

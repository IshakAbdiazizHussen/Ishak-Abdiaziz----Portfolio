import Image from "next/image";
import type { LogEntry } from "@/lib/types";
import { isBlobHosted, isPdfAttachment, isStoredAttachment, thumbFor } from "./log-attachment";
import { PdfPreview } from "./PdfPreview";
import { Reveal } from "./Reveal";
import styles from "./LogEntryCard.module.css";

/**
 * Presentational. `entry.description` is rendered as plain text by React's
 * default escaping — never as HTML (constraint C9).
 *
 * `variant="column"` is the layout used inside the Log page's three grouped
 * columns: image on top, text below, always — the columns are narrower than
 * any viewport breakpoint so the side-by-side `"feed"` layout can't be used.
 */
export function LogEntryCard({
  entry,
  variant = "feed",
}: {
  entry: LogEntry;
  variant?: "feed" | "column";
}) {
  return (
    <Reveal>
      <article
        className={[styles.card, variant === "column" ? styles.cardColumn : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.media}>
          {!isStoredAttachment(entry.imageUrl) ? (
            <span className={styles.placeholder}>Image</span>
          ) : isPdfAttachment(entry.imageUrl) ? (
            <PdfPreview
              pdfUrl={entry.imageUrl}
              previewUrl={thumbFor(entry.imageUrl) ?? entry.imageUrl}
              blobHosted={isBlobHosted(entry.imageUrl)}
            />
          ) : isBlobHosted(entry.imageUrl) ? (
            <Image
              src={entry.imageUrl}
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 15rem"
              className={styles.image}
            />
          ) : (
            // Local-dev upload driver — not an allow-listed next/image host.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.imageUrl} alt="" className={styles.imageEl} />
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

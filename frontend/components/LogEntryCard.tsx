import Image from "next/image";
import type { LogEntry } from "@/lib/types";
import { Reveal } from "./Reveal";
import styles from "./LogEntryCard.module.css";

/**
 * Presentational. `entry.description` is rendered as plain text by React's
 * default escaping — never as HTML (constraint C9).
 */
export function LogEntryCard({ entry }: { entry: LogEntry }) {
  return (
    <Reveal>
      <article className={styles.card}>
        <div className={styles.media}>
          <Image
            src={entry.imageUrl}
            alt=""
            fill
            sizes="(max-width: 800px) 100vw, 620px"
            className={styles.image}
          />
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

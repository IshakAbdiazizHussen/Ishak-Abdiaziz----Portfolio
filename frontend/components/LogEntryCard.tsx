import Image from "next/image";
import type { LogEntry } from "@/lib/types";
import { formatLogDate } from "@/lib/format";
import { MonoLabel } from "./MonoLabel";
import { Reveal } from "./Reveal";
import { Tag } from "./Tag";
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
          <MonoLabel as="div">{formatLogDate(entry.date)}</MonoLabel>
          <h3 className={styles.title}>{entry.title}</h3>
          <p className={styles.description}>{entry.description}</p>
          {entry.tags.length > 0 ? (
            <div className={styles.tags}>
              {entry.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : null}
        </div>
      </article>
    </Reveal>
  );
}

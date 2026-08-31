import type { LogEntry } from "@/lib/types";
import { LogEntryCard } from "./LogEntryCard";
import styles from "./LogFeed.module.css";

export function LogFeed({ entries }: { entries: LogEntry[] }) {
  return (
    <ol className={styles.feed}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <LogEntryCard entry={entry} />
        </li>
      ))}
    </ol>
  );
}

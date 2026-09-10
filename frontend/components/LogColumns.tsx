import type { LogCategory, LogEntry } from "@/lib/types";
import { LogEntryCard } from "./LogEntryCard";
import styles from "./LogColumns.module.css";

/**
 * The public Log, grouped into three columns — Learned | Shipped | Working on,
 * left to right. Each column lists only its own category's entries, newest
 * first (the backend already returns them in that order; grouping preserves
 * it). Columns are independent — different lengths, no shared height.
 *
 * Desktop: a 3-column hairline grid (same divider treatment as the Toolbox
 * groups). Below `--log-columns-stack` (64rem) it collapses to three
 * full-width stacked sections in the same order.
 */

const COLUMNS: ReadonlyArray<{ category: LogCategory; heading: string; empty: string }> = [
  { category: "learned", heading: "Learned", empty: "Nothing logged under Learned yet." },
  { category: "shipped", heading: "Shipped", empty: "Nothing shipped yet." },
  { category: "working", heading: "Working on", empty: "Nothing in progress right now." },
];

/** Bucket entries by category, keeping the incoming (newest-first) order. */
function groupByCategory(entries: LogEntry[]): Record<LogCategory, LogEntry[]> {
  const groups: Record<LogCategory, LogEntry[]> = { learned: [], shipped: [], working: [] };
  for (const entry of entries) {
    // An unrecognised category (e.g. a stale cache entry from before the
    // migration) falls back to Learned rather than vanishing.
    const key: LogCategory = entry.category in groups ? entry.category : "learned";
    groups[key].push(entry);
  }
  return groups;
}

export function LogColumns({ entries }: { entries: LogEntry[] }) {
  const groups = groupByCategory(entries);

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {COLUMNS.map(({ category, heading, empty }) => {
          const items = groups[category];
          return (
            <section key={category} className={styles.column}>
              <h2 className={styles.heading}>
                {heading}
                <span className={styles.count}>{items.length}</span>
              </h2>
              {items.length === 0 ? (
                <p className={styles.empty}>{empty}</p>
              ) : (
                <ol className={styles.list}>
                  {items.map((entry) => (
                    <li key={entry.id}>
                      <LogEntryCard entry={entry} variant="column" />
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

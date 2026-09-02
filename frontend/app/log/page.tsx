import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { LogFeed } from "@/components/LogFeed";
import { fetchLogEntries } from "@/lib/log";
import type { LogEntry } from "@/lib/types";
import styles from "./log.module.css";

export const metadata: Metadata = {
  title: "Log",
  description: "A reverse-chronological feed of things shipped, learned, and achieved.",
};

// Dynamic: fetched per request with no frontend cache (the backend caches).
export const dynamic = "force-dynamic";

export default async function LogPage() {
  let entries: LogEntry[] | null = null;
  let failed = false;

  try {
    entries = await fetchLogEntries();
  } catch {
    failed = true;
  }

  return (
    <Container>
      <header className={styles.header}>
        <p className={styles.kicker}>Log</p>
        <h1 className={styles.title}>Shipped, learned, broken</h1>
      </header>

      {failed ? (
        <p className={styles.notice}>
          The log couldn&apos;t be loaded right now. Please try again in a bit.
        </p>
      ) : !entries || entries.length === 0 ? (
        <p className={styles.notice}>Nothing logged yet.</p>
      ) : (
        <LogFeed entries={entries} />
      )}
    </Container>
  );
}

import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { LogColumns } from "@/components/LogColumns";
import { fetchLogEntries } from "@/lib/log";
import type { LogEntry } from "@/lib/types";
import styles from "./log.module.css";

export const metadata: Metadata = {
  title: "Log",
  description:
    "Grouped into what I've learned, what I've shipped, and what I'm working on — each column newest first.",
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
    <>
      <Container>
        <header className={styles.header}>
          <p className={styles.kicker}>Log</p>
          <h1 className={styles.title}>Learned, shipped, working on</h1>
          <p className={styles.sub}>
            A running record in three columns. An entry goes in when something is actually done —
            or, in the last column, actively underway. Each column is newest first.
          </p>
        </header>

        {failed ? (
          <p className={styles.notice}>
            The log couldn&apos;t be loaded right now. Please try again in a bit.
          </p>
        ) : null}
      </Container>

      {!failed ? <LogColumns entries={entries ?? []} /> : null}
    </>
  );
}

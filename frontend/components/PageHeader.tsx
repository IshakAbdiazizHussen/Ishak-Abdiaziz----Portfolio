import type { ReactNode } from "react";
import { MonoLabel } from "./MonoLabel";
import styles from "./PageHeader.module.css";

/** Standard page masthead: kicker + h1 + optional intro line. */
export function PageHeader({
  kicker,
  title,
  intro,
}: {
  kicker?: string;
  title: string;
  intro?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      {kicker ? (
        <MonoLabel as="div" className={styles.kicker}>
          {kicker}
        </MonoLabel>
      ) : null}
      <h1 className={styles.title}>{title}</h1>
      {intro ? <p className={styles.intro}>{intro}</p> : null}
    </header>
  );
}

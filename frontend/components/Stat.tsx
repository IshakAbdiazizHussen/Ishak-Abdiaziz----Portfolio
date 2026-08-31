import styles from "./Stat.module.css";

/** A single measured figure: big mono value, faint mono label, optional note. */
export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
      {note ? <span className={styles.note}>{note}</span> : null}
    </div>
  );
}

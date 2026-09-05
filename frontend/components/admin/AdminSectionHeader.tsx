import styles from "./AdminSectionHeader.module.css";

/** Shared heading for the five section pages — same style as the Log page's own. */
export function AdminSectionHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className={styles.header}>
      <h1 className={styles.heading}>{title}</h1>
      <p className={styles.intro}>{intro}</p>
    </header>
  );
}

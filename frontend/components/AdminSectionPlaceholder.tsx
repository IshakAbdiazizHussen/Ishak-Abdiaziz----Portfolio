import styles from "./AdminSectionPlaceholder.module.css";

/**
 * Placeholder for the five sections whose real edit forms land in feature 17
 * (Intro, Built, How I Got Here, Toolbox, Let's Talk). Log already has its
 * real form — see app/admin/log/page.tsx.
 */
export function AdminSectionPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className={styles.heading}>{title}</h1>
      <p className={styles.body}>Form goes here.</p>
    </div>
  );
}

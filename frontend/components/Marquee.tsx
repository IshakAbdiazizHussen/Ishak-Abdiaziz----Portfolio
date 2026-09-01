import styles from "./Marquee.module.css";

/**
 * Full-bleed tech-stack strip: a top and bottom rule, an inset label, and an
 * infinite CSS marquee of bordered chips. The animated track is `aria-hidden`
 * and duplicated; a real list is provided for assistive tech and shown (wrapped,
 * static) under `prefers-reduced-motion`.
 */
export function Marquee({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <section className={styles.section}>
      <p className={styles.label}>{label}</p>

      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.track}>
          {[...items, ...items].map((item, i) => (
            <span key={`${item}-${i}`} className={styles.item}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <ul className={styles.list} aria-label={label}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

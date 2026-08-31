import styles from "./Marquee.module.css";

/**
 * Infinite horizontal tech-stack marquee — pure CSS. The animated track is
 * duplicated and `aria-hidden`; a real list is provided for assistive tech.
 * Under `prefers-reduced-motion: reduce` the marquee is hidden and that list
 * becomes a visible wrapped set of chips (no animation).
 */
export function Marquee({ items }: { items: readonly string[] }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.track}>
          {[...items, ...items].map((item, i) => (
            <span key={`${item}-${i}`} className={styles.item}>
              {item}
            </span>
          ))}
        </div>
      </div>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

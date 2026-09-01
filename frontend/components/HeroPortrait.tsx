import styles from "./HeroPortrait.module.css";

/**
 * Placeholder for the hero portrait. Swap for
 * `<Image src={…} alt="…" fill priority className={styles.photo} />` once a real
 * square headshot exists.
 */
export function HeroPortrait() {
  return (
    <figure className={styles.wrap}>
      <div className={styles.frame}>
        <span className={styles.corner} aria-hidden="true" />
        <span className={styles.disc} aria-hidden="true" />
        <span className={styles.label}>
          Portrait
          <br />
          Placeholder
        </span>
      </div>
      <figcaption className={styles.caption}>
        Drop a square headshot here — clean crop, plain background.
      </figcaption>
    </figure>
  );
}

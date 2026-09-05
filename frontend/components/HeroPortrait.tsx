import Image from "next/image";
import styles from "./HeroPortrait.module.css";

/** The original hardcoded photo — the default whenever no `src` is given (see below). */
const DEFAULT_SRC = "/Ishak-removebg-preview.png";

/**
 * `src` comes from the backend (feature 18) once the owner uploads a real
 * hero photo via the admin panel; until then `heroPhotoUrl` is empty and
 * `Hero.tsx` passes `undefined`, so this falls back to the exact same local
 * asset it always rendered. Same fixed dimensions either way — an
 * admin-uploaded photo of a different aspect ratio will scale to fit via the
 * existing `width: 100%; height: auto` CSS, not stretch or crop unexpectedly.
 */
export function HeroPortrait({ src = DEFAULT_SRC }: { src?: string } = {}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <span className={styles.corner} aria-hidden="true" />
        <Image
          src={src}
          alt="Ishak Abdiaziz"
          width={393}
          height={634}
          priority
          sizes="(max-width: 82rem) 90vw, 32rem"
          className={styles.photo}
        />
      </div>
    </div>
  );
}

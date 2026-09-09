import Image from "next/image";
import styles from "./HeroPortrait.module.css";

/** The hardcoded hero photo — the default whenever no `src` is given (see below). */
const DEFAULT_SRC = "/Portfolio-removebg-preview.png";

/**
 * `src` comes from the backend (feature 18) once the owner uploads a real
 * hero photo via the admin panel; until then `heroPhotoUrl` is empty and
 * `Hero.tsx` passes `undefined`, so this falls back to the local
 * `public/Portfolio-removebg-preview.png` (440×566, background removed). The
 * `width`/`height` here only set the intrinsic aspect ratio for CLS;
 * `.photo { width: 100%; height: auto }` does the actual sizing, so an
 * admin-uploaded photo of a different aspect ratio scales to fit rather than
 * stretching or cropping.
 */
export function HeroPortrait({ src = DEFAULT_SRC }: { src?: string } = {}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <span className={styles.corner} aria-hidden="true" />
        <Image
          src={src}
          alt="Ishak Abdiaziz"
          width={440}
          height={566}
          priority
          sizes="(max-width: 82rem) 90vw, 32rem"
          className={styles.photo}
        />
      </div>
    </div>
  );
}

import Image from "next/image";
import styles from "./HeroPortrait.module.css";

/** The hardcoded hero photo — the default whenever no `src` is given (see below). */
const DEFAULT_SRC = "/hero-portrait.png";

/**
 * `src` comes from the backend (feature 18) once the owner uploads a real
 * hero photo via the admin panel; until then `heroPhotoUrl` is empty and
 * `Hero.tsx` passes `undefined`, so this falls back to the local
 * `public/hero-portrait.png` (334×462) — a head-and-shoulders crop of the
 * background-removed source with its transparent side margins trimmed off, so
 * the subject fills the frame and reads large without upscaling more than
 * necessary from the 440px-wide source. The `width`/`height` here only set the
 * intrinsic aspect ratio for CLS; `.photo { width: 100%; height: auto }` does
 * the actual sizing, so an admin-uploaded photo of a different aspect ratio
 * scales to fit rather than stretching or cropping. The photo sits directly on
 * the page — no frame, border, or crop-mark.
 */
export function HeroPortrait({ src = DEFAULT_SRC }: { src?: string } = {}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <Image
          src={src}
          alt="Ishak Abdiaziz"
          width={334}
          height={462}
          priority
          sizes="(max-width: 82rem) 90vw, 31rem"
          className={styles.photo}
        />
      </div>
    </div>
  );
}

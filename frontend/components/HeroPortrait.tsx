import Image from "next/image";
import styles from "./HeroPortrait.module.css";

export function HeroPortrait() {
  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
        <span className={styles.corner} aria-hidden="true" />
        <Image
          src="/Ishak.jpg"
          alt="Ishak Abdiaziz"
          width={670}
          height={1080}
          priority
          sizes="(max-width: 82rem) 90vw, 32rem"
          className={styles.photo}
        />
      </div>
    </div>
  );
}

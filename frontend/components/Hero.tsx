import { intro } from "@/content/intro";
import { PortraitPlaceholder } from "./PortraitPlaceholder";
import { Reveal } from "./Reveal";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <Reveal>
      <div className={styles.hero}>
        <div className={styles.body}>
          <p className={styles.kicker}>{intro.kicker}</p>
          <h1 className={styles.headline}>
            {intro.headlineHead}
            <br />
            <span className={styles.tail}>{intro.headlineTail}</span>
          </h1>
        </div>
        {/* Right column — reserved for a hero image. */}
        <div className={styles.media}>
          <PortraitPlaceholder />
        </div>
      </div>
    </Reveal>
  );
}

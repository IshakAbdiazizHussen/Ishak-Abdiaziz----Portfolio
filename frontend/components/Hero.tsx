import Link from "next/link";
import { intro } from "@/content/intro";
import { MonoLabel } from "./MonoLabel";
import { PortraitPlaceholder } from "./PortraitPlaceholder";
import { Reveal } from "./Reveal";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <Reveal>
      <div className={styles.hero}>
        <div className={styles.body}>
          <MonoLabel as="div" className={styles.kicker}>
            Intro
          </MonoLabel>
          <h1 className={styles.headline}>{intro.headline}</h1>
          <p className={styles.sub}>{intro.subheadline}</p>
          <div className={styles.actions}>
            <Link href={intro.primaryCta.href} className="button">
              {intro.primaryCta.label}
            </Link>
            <Link href={intro.secondaryCta.href} className="button-ghost">
              {intro.secondaryCta.label}
            </Link>
          </div>
        </div>
        <div className={styles.portrait}>
          <PortraitPlaceholder />
        </div>
      </div>
    </Reveal>
  );
}

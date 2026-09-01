import { Fragment } from "react";
import Link from "next/link";
import { heroStats, intro } from "@/content/intro";
import { HeroPortrait } from "./HeroPortrait";
import { Reveal } from "./Reveal";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <Reveal>
      <div className={styles.hero}>
        <div className={styles.body}>
          <p className={styles.kicker}>{intro.kicker}</p>
          <h1 className={styles.headline}>
            {intro.headlineLines.map((line, i) => (
              <Fragment key={line}>
                {i > 0 ? <br /> : null}
                {line}
              </Fragment>
            ))}
          </h1>
          <p className={styles.sub}>{intro.subheadline}</p>

          <div className={styles.actions}>
            <Link href={intro.primaryCta.href} className={styles.cta}>
              {intro.primaryCta.label}
            </Link>
            <Link href={intro.secondaryCta.href} className={styles.ctaGhost}>
              {intro.secondaryCta.label}
            </Link>
          </div>

          <dl className={styles.stats}>
            {heroStats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <dt className={styles.statLabel}>{stat.label}</dt>
                <dd className={styles.statValue}>
                  <span className={stat.accent ? styles.accentValue : undefined}>{stat.value}</span>
                  {stat.note ? <span className={styles.statNote}> {stat.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.media}>
          <HeroPortrait />
        </div>
      </div>
    </Reveal>
  );
}

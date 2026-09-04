import type { Project } from "@/content/projects";
import { Reveal } from "./Reveal";
import styles from "./ProjectCard.module.css";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Reveal className={styles.reveal}>
      <article className={styles.card}>
        <header className={styles.head}>
          <div className={styles.heading}>
            <h2 className={styles.name}>{project.name}</h2>
            <span className={styles.badge}>{project.lead ? "Lead project" : "Project"}</span>
          </div>
          <p className={styles.stack}>{project.stack.join("  ·  ")}</p>
        </header>

        <div className={styles.body}>
          <div className={styles.main}>
            <p className={styles.hook}>{project.hook}</p>

            <div className={styles.block}>
              <p className={styles.blockLabel}>What it does</p>
              <p className={styles.prose}>{project.whatItDoes}</p>
            </div>

            {project.decision ? (
              <div className={styles.block}>
                <p className={styles.blockLabel}>One hard decision</p>
                <p className={styles.prose}>{project.decision}</p>
              </div>
            ) : null}

            <div className={styles.actions}>
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cta}
              >
                {project.demoLabel}
              </a>
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaGhost}
              >
                Source
              </a>
            </div>
          </div>

          <aside className={styles.side}>
            <div className={styles.panel}>
              <p className={styles.panelLabel}>{project.statsLabel}</p>
              <dl className={styles.miniStats}>
                {project.stats.map((stat) => (
                  <div key={stat.label} className={styles.miniStat}>
                    <dt className={styles.miniLabel}>{stat.label}</dt>
                    <dd
                      className={[styles.miniValue, stat.accent ? styles.miniValueAccent : ""]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {project.failuresLabel && project.failures && project.failures.length > 0 ? (
              <div className={styles.panel}>
                <p className={styles.panelLabel}>{project.failuresLabel}</p>
                <ul className={styles.failList}>
                  {project.failures.map((failure) => (
                    <li key={failure}>{failure}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {project.api ? (
              <div className={[styles.panel, styles.codePanel].join(" ")}>
                <p className={styles.codeTitle}>{project.api.title}</p>
                <pre className={styles.code}>{project.api.lines.join("\n")}</pre>
              </div>
            ) : null}
          </aside>
        </div>
      </article>
    </Reveal>
  );
}

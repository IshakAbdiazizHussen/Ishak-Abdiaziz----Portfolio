import type { Project } from "@/content/projects";
import { MonoLabel } from "./MonoLabel";
import { Reveal } from "./Reveal";
import { Stat } from "./Stat";
import { Tag } from "./Tag";
import styles from "./ProjectCard.module.css";

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const flagship = project.role === "flagship";

  return (
    <Reveal>
      <article className={[styles.card, flagship ? styles.flagship : ""].filter(Boolean).join(" ")}>
        <MonoLabel as="div" className={styles.kicker}>
          {String(index).padStart(2, "0")} · {flagship ? "Flagship" : "Project"}
        </MonoLabel>
        <h2 className={styles.name}>{project.name}</h2>
        <p className={styles.hook}>{project.hook}</p>
        <p className={styles.body}>{project.whatItDoes}</p>

        <div className={styles.decision}>
          <MonoLabel as="div">One hard decision</MonoLabel>
          <h3 className={styles.decisionTitle}>{project.decisionStory.title}</h3>
          <p className={styles.decisionBody}>{project.decisionStory.body}</p>
        </div>

        <div className={styles.stats}>
          {project.stats.map((stat) => (
            <Stat key={stat.label} label={stat.label} value={stat.value} note={stat.note} />
          ))}
        </div>

        {project.stack.length > 0 ? (
          <div className={styles.stack}>
            {project.stack.map((tool) => (
              <Tag key={tool}>{tool}</Tag>
            ))}
          </div>
        ) : null}

        <div className={styles.links}>
          <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="button">
            Live demo ↗
          </a>
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button-ghost"
          >
            Source ↗
          </a>
        </div>
      </article>
    </Reveal>
  );
}

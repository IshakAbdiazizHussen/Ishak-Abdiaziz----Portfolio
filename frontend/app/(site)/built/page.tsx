import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { NextTeaser } from "@/components/NextTeaser";
import { ProjectCard } from "@/components/ProjectCard";
import { builtHeader, builtNext, projects as fallbackProjects } from "@/content/projects";
import { fetchProjects } from "@/lib/content";
import styles from "./built.module.css";

export const metadata: Metadata = {
  title: "Built",
  description:
    "Two deployed projects — a PyTorch image classifier with production guardrails, and " +
    "a self-correcting LangGraph web research agent.",
};

export default async function BuiltPage() {
  // Feature 18: the projects (incl. stats) are backend-fetched. `fallbackProjects`
  // (the old hardcoded array) is used verbatim if the backend/DB is unreachable —
  // the page must never look broken. builtHeader/builtNext are page chrome, not
  // part of the projects content-area schema, and stay hardcoded either way.
  let projects = fallbackProjects;
  try {
    const fetched = await fetchProjects();
    if (fetched.length > 0) projects = fetched;
  } catch {
    // Backend/DB unreachable — keep the hardcoded fallback above.
  }

  return (
    <>
      <Container>
        <header className={styles.header}>
          <p className={styles.kicker}>{builtHeader.kicker}</p>
          <h1 className={styles.title}>{builtHeader.title}</h1>
          <p className={styles.sub}>{builtHeader.sub}</p>
        </header>
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </Container>
      <div className={styles.next}>
        <NextTeaser
          href={builtNext.href}
          kicker={builtNext.kicker}
          title={builtNext.title}
          sub=""
          arrow="right"
          context="Log"
          narrow
        />
      </div>
    </>
  );
}

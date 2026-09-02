import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ProjectCard } from "@/components/ProjectCard";
import { builtHeader, projects } from "@/content/projects";
import styles from "./built.module.css";

export const metadata: Metadata = {
  title: "Built",
  description:
    "Two deployed projects — a PyTorch image classifier with production guardrails, and " +
    "a self-correcting LangGraph web research agent.",
};

export default function BuiltPage() {
  return (
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
  );
}

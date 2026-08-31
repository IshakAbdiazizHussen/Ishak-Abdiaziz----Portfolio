import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { ProjectCard } from "@/components/ProjectCard";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Built",
  description:
    "Two deployed projects — a PyTorch image classifier with production guardrails, and " +
    "a self-correcting LangGraph web research agent.",
};

export default function BuiltPage() {
  return (
    <Container>
      <PageHeader
        kicker="Built"
        title="Built"
        intro="Two real, deployed projects. Each one told through a single hard technical decision."
      />
      {projects.map((project, i) => (
        <ProjectCard key={project.slug} project={project} index={i + 1} />
      ))}
    </Container>
  );
}

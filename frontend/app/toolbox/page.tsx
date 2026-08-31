import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { MonoLabel } from "@/components/MonoLabel";
import { toolbox } from "@/content/toolbox";
import styles from "./toolbox.module.css";

export const metadata: Metadata = {
  title: "Toolbox",
  description: "An honest, grouped list of the technologies I actually use.",
};

export default function ToolboxPage() {
  return (
    <Container>
      <PageHeader
        kicker="Toolbox"
        title="Toolbox"
        intro="What I actually reach for — grouped, honest, no logo wall. If it's listed, I can talk about it in an interview."
      />
      <div className={styles.groups}>
        {toolbox.map((group) => (
          <section key={group.group} className={styles.group}>
            <MonoLabel as="h2" className={styles.groupName}>
              {group.group}
            </MonoLabel>
            <ul className={styles.items}>
              {group.items.map((tool) => (
                <li key={tool.name} className={styles.item}>
                  <span className={styles.name}>{tool.name}</span>
                  {tool.note ? <span className={styles.note}>{tool.note}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}

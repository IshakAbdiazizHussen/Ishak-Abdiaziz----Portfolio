import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { MonoLabel } from "@/components/MonoLabel";
import { toolbox, toolboxHeader } from "@/content/toolbox";
import styles from "./toolbox.module.css";

export const metadata: Metadata = {
  title: "Toolbox",
  description: "An honest, grouped list of the technologies I actually use.",
};

export default function ToolboxPage() {
  return (
    <Container>
      <header className={styles.header}>
        <p className={styles.kicker}>{toolboxHeader.kicker}</p>
        <h1 className={styles.title}>{toolboxHeader.title}</h1>
      </header>
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

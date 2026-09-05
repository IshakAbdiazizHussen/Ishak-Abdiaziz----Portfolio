import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { toolbox as fallbackToolbox, toolboxHeader, toolboxNote } from "@/content/toolbox";
import { fetchToolbox } from "@/lib/content";
import styles from "./toolbox.module.css";

export const metadata: Metadata = {
  title: "Toolbox",
  description: "An honest, grouped list of the technologies I actually use.",
};

export default async function ToolboxPage() {
  // Feature 18: the groups + items are backend-fetched. `fallbackToolbox` (the
  // old hardcoded array) is used verbatim if the backend/DB is unreachable —
  // the page must never look broken. toolboxHeader/toolboxNote are page
  // chrome, not part of the toolbox content-area schema, and stay hardcoded
  // either way.
  let toolbox = fallbackToolbox;
  try {
    const fetched = await fetchToolbox();
    if (fetched.length > 0) toolbox = fetched;
  } catch {
    // Backend/DB unreachable — keep the hardcoded fallback above.
  }

  return (
    <>
      <Container>
        <header className={styles.header}>
          <p className={styles.kicker}>{toolboxHeader.kicker}</p>
          <h1 className={styles.title}>{toolboxHeader.title}</h1>
          <p className={styles.sub}>{toolboxHeader.sub}</p>
        </header>
      </Container>
      <div className={styles.groupsWrap}>
        <div className={styles.groups}>
          {toolbox.map((group) => (
            <section key={group.group} className={styles.group}>
              <h2 className={styles.groupName}>{group.group}</h2>
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
        <p className={styles.footnote}>{toolboxNote}</p>
      </div>
    </>
  );
}

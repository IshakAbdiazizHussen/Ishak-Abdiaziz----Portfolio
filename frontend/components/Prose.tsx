import type { ReactNode } from "react";
import styles from "./Prose.module.css";

/** Long-form text wrapper — styles descendant p / headings / lists / links. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[styles.prose, className].filter(Boolean).join(" ")}>{children}</div>;
}

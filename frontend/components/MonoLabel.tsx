import type { ReactNode } from "react";
import styles from "./MonoLabel.module.css";

/** Small uppercase monospace label — section kickers, dates, field labels. */
export function MonoLabel({
  children,
  as: As = "span",
  className,
}: {
  children: ReactNode;
  as?: "span" | "div" | "p" | "h2" | "h3";
  className?: string;
}) {
  return <As className={[styles.label, className].filter(Boolean).join(" ")}>{children}</As>;
}

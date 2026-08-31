import type { ReactNode } from "react";
import styles from "./Container.module.css";

/** Centered, max-width page column. `size="prose"` narrows it for long-form text. */
export function Container({
  children,
  size = "page",
  className,
}: {
  children: ReactNode;
  size?: "page" | "prose";
  className?: string;
}) {
  return <div className={[styles[size], className].filter(Boolean).join(" ")}>{children}</div>;
}

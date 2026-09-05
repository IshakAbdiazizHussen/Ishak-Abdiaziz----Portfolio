import styles from "./SavedIndicator.module.css";

export type SaveStatus = "idle" | "working" | "done" | "error";

/**
 * Shared status line — success/error/loading — reused across all five
 * section forms (feature 17), matching `LogEntryForm`'s existing `.status`
 * paragraph (feature 10) so the whole admin area reads as one convention.
 */
export function SavedIndicator({ status, message }: { status: SaveStatus; message: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={[styles.status, status === "done" ? styles.ok : "", status === "error" ? styles.bad : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {message}
    </p>
  );
}

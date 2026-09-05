"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import styles from "./ConfirmStatChange.module.css";

/**
 * Constraint C18, UI layer. The ONLY place a project stat write is triggered
 * from (see `ProjectStatEditor`/`AddStatForm`) — there is no button anywhere
 * else that calls `updateStat`/`createStat` directly. Shows the old and new
 * value side by side and requires an explicit Confirm click; Cancel or
 * Escape closes it with no network call.
 *
 * Rendered inline (next to the field being edited) rather than in a portal —
 * the plan explicitly allows "a modal/inline panel." It still uses
 * `role="alertdialog"` + `aria-modal`, focuses Confirm on open, and traps Tab
 * between its two buttons.
 */
export function ConfirmStatChange({
  oldValue,
  newValue,
  onConfirm,
  onCancel,
}: {
  /** `"— none —"` for a brand-new stat that doesn't exist yet. */
  oldValue: string;
  newValue: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const uid = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const first = cancelRef.current;
    const last = confirmRef.current;
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${uid}-title`}
      className={styles.dialog}
      onKeyDown={onKeyDown}
    >
      <p id={`${uid}-title`} className={styles.title}>
        Confirm this change?
      </p>
      <dl className={styles.compare}>
        <div>
          <dt>Old value</dt>
          <dd>{oldValue}</dd>
        </div>
        <div>
          <dt>New value</dt>
          <dd>{newValue}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <button type="button" ref={cancelRef} className="button-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" ref={confirmRef} className="button" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </div>
  );
}

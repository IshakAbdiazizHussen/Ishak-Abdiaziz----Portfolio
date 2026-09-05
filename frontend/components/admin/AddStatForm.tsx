"use client";

import { useState } from "react";
import { BackendError } from "@/lib/backend";
import { createStat, NotAuthenticatedError } from "@/lib/admin";
import type { ProjectStat } from "@/lib/types";
import { ConfirmStatChange } from "./ConfirmStatChange";
import styles from "./ProjectStatEditor.module.css";

/**
 * The "+ Add stat" control. Same confirm-before-save shape as
 * `ProjectStatEditor`, but with no `previousValue` — there is no current row
 * yet, so the dialog compares against "— none —" (constraint C18).
 */
export function AddStatForm({
  projectId,
  onCreated,
  onSessionExpired,
}: {
  projectId: string;
  onCreated: (stat: ProjectStat) => void;
  onSessionExpired: () => void;
}) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [accent, setAccent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = label.trim() !== "" && value.trim() !== "";

  function onAddClick() {
    setError("");
    if (busy || !canSubmit) return;
    setConfirming(true);
  }

  async function onConfirm() {
    setConfirming(false);
    setBusy(true);
    setError("");
    try {
      const created = await createStat(projectId, {
        label: label.trim(),
        value: value.trim(),
        note: note.trim() ? note.trim() : null,
        accent,
      });
      onCreated(created);
      setLabel("");
      setValue("");
      setNote("");
      setAccent(false);
    } catch (err) {
      if (err instanceof NotAuthenticatedError) {
        onSessionExpired();
        return;
      }
      setError(err instanceof BackendError ? err.message : "Couldn't add the stat. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={styles.row}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={busy}
            placeholder="e.g. Accuracy"
          />
        </label>
        <label className={styles.field}>
          <span>Value</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            placeholder="e.g. 78.2%"
          />
        </label>
        <label className={styles.field}>
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
        </label>
        <label className={styles.accentField}>
          <input
            type="checkbox"
            checked={accent}
            onChange={(e) => setAccent(e.target.checked)}
            disabled={busy}
          />
          <span>Accent</span>
        </label>
        <button type="button" className="button-ghost" onClick={onAddClick} disabled={!canSubmit || busy}>
          {busy ? "Adding…" : "+ Add stat"}
        </button>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmStatChange
          oldValue="— none —"
          newValue={value.trim()}
          onConfirm={onConfirm}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </li>
  );
}

"use client";

import { useId, useState } from "react";
import { BackendError } from "@/lib/backend";
import { updateStat, NotAuthenticatedError, StatConflictError } from "@/lib/admin";
import type { ProjectStat } from "@/lib/types";
import { ConfirmStatChange } from "./ConfirmStatChange";
import styles from "./ProjectStatEditor.module.css";

interface Baseline {
  label: string;
  value: string;
  note: string;
  accent: boolean;
}

function baselineOf(stat: ProjectStat): Baseline {
  return { label: stat.label, value: stat.value, note: stat.note ?? "", accent: stat.accent };
}

/**
 * One existing stat. Constraint C18: this component NEVER calls `updateStat`
 * directly from a field or the Save button — Save only opens
 * `ConfirmStatChange`; only that dialog's Confirm click triggers the write,
 * and only with the exact `previousValue` it just displayed.
 *
 * `baseline` is the last state this editor confirmed is actually stored on
 * the server — it starts at the prop `stat` and is corrected ONLY from a
 * server response (a successful save, or a 409's real current value), never
 * guessed. It is what `previousValue` is drawn from, what "dirty" is
 * measured against, and what Cancel reverts the fields to.
 */
export function ProjectStatEditor({
  projectId,
  stat,
  onUpdated,
  onSessionExpired,
}: {
  projectId: string;
  stat: ProjectStat;
  onUpdated: (updated: ProjectStat) => void;
  onSessionExpired: () => void;
}) {
  const uid = useId();

  const [baseline, setBaseline] = useState<Baseline>(() => baselineOf(stat));
  const [label, setLabel] = useState(baseline.label);
  const [value, setValue] = useState(baseline.value);
  const [note, setNote] = useState(baseline.note);
  const [accent, setAccent] = useState(baseline.accent);

  // Non-null while the confirm dialog is open; its value is the "old value"
  // it is currently showing.
  const [confirmOldValue, setConfirmOldValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dirty =
    label.trim() !== baseline.label ||
    value.trim() !== baseline.value ||
    note.trim() !== baseline.note ||
    accent !== baseline.accent;

  function onSaveClick() {
    setError("");
    if (busy || !dirty || !label.trim() || !value.trim()) return;
    setConfirmOldValue(baseline.value);
  }

  function onCancel() {
    // No network call, and every field reverts to the last confirmed state —
    // Cancel is a full no-op, not a partial one.
    setConfirmOldValue(null);
    setLabel(baseline.label);
    setValue(baseline.value);
    setNote(baseline.note);
    setAccent(baseline.accent);
  }

  async function onConfirm() {
    setConfirmOldValue(null);
    setBusy(true);
    setError("");
    try {
      const updated = await updateStat(projectId, stat.id, {
        previousValue: baseline.value, // exactly what the dialog just displayed as "old"
        label: label.trim(),
        value: value.trim(),
        note: note.trim() ? note.trim() : null,
        accent,
      });
      const next = baselineOf(updated);
      setBaseline(next);
      setLabel(next.label);
      setValue(next.value);
      setNote(next.note);
      setAccent(next.accent);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof NotAuthenticatedError) {
        onSessionExpired();
        return;
      }
      if (err instanceof StatConflictError) {
        // Re-anchor the baseline to the REAL current value and require
        // confirming again — never silently retry with the stale one.
        setBaseline((prev) => ({ ...prev, value: err.currentValue }));
        setConfirmOldValue(err.currentValue);
        setError("This stat changed since it was loaded — review and confirm again.");
        return;
      }
      setError(err instanceof BackendError ? err.message : "Couldn't save. Try again.");
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
            id={`${uid}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className={styles.field}>
          <span>Value</span>
          <input
            id={`${uid}-value`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className={styles.field}>
          <span>Note</span>
          <input
            id={`${uid}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
          />
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
        <button
          type="button"
          className="button-ghost"
          onClick={onSaveClick}
          disabled={!dirty || busy || !label.trim() || !value.trim()}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {confirmOldValue !== null ? (
        <ConfirmStatChange
          oldValue={confirmOldValue}
          newValue={value.trim()}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ) : null}
    </li>
  );
}

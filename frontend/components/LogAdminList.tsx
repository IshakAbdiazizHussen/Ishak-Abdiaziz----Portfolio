"use client";

import { useState } from "react";
import { BackendError } from "@/lib/backend";
import { deleteEntry, NotAuthenticatedError } from "@/lib/admin";
import { formatLogDate } from "@/lib/format";
import type { LogEntry } from "@/lib/types";
import { isPdfAttachment, isStoredAttachment, thumbFor } from "./log-attachment";
import styles from "./LogEntryForm.module.css";

interface Props {
  entries: LogEntry[] | null;
  loadFailed: boolean;
  editingId: string | null;
  onEdit: (entry: LogEntry) => void;
  onReload: () => void;
  onSessionExpired: () => void;
}

/**
 * Admin-only list of every published Log entry with per-row Preview / Edit /
 * Delete. Read state comes from the parent (`LogEntryForm`); this component
 * owns only the transient UI state (which row is expanded, which is awaiting a
 * delete confirmation).
 */
export function LogAdminList({
  entries,
  loadFailed,
  editingId,
  onEdit,
  onReload,
  onSessionExpired,
}: Props) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function doDelete(id: string) {
    setBusyId(id);
    setError("");
    try {
      await deleteEntry(id);
      setConfirmId(null);
      if (previewId === id) setPreviewId(null);
      onReload();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setError(
        err instanceof BackendError ? `Couldn't delete: ${err.message}` : "Couldn't delete the entry.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <aside className={styles.recent}>
      <div className={styles.recentHead}>
        <h2 className={styles.recentTitle}>
          Published entries{entries ? ` (${entries.length})` : ""}
        </h2>
        <a href="/log" target="_blank" rel="noopener noreferrer" className={styles.recentLink}>
          View public Log ↗
        </a>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {entries === null ? (
        <p className={styles.hint}>Loading…</p>
      ) : loadFailed ? (
        <p className={styles.error}>
          Couldn&apos;t load the entries.{" "}
          <button type="button" className={styles.linkBtn} onClick={onReload}>
            Retry
          </button>
        </p>
      ) : entries.length === 0 ? (
        <p className={styles.hint}>Nothing logged yet.</p>
      ) : (
        <ul className={styles.recentList}>
          {entries.map((entry) => {
            const thumb = thumbFor(entry.imageUrl);
            const open = previewId === entry.id;
            const confirming = confirmId === entry.id;
            const rowBusy = busyId === entry.id;
            return (
              <li
                key={entry.id}
                className={[styles.entryRow, editingId === entry.id ? styles.entryEditing : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {thumb ? (
                  <button
                    type="button"
                    className={styles.thumb}
                    onClick={() => setPreviewId(open ? null : entry.id)}
                    aria-label={open ? "Hide preview" : "Show preview"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin-only, mixed hosts */}
                    <img src={thumb} alt="" />
                  </button>
                ) : (
                  <span className={styles.thumbEmpty} aria-hidden="true" />
                )}

                <div className={styles.entryMeta}>
                  <span className={styles.recentDate}>{formatLogDate(entry.date)}</span>
                  <span className={styles.entryTitle}>{entry.title}</span>
                  <span className={open ? styles.entryDescFull : styles.entryDesc}>
                    {entry.description}
                  </span>
                  {entry.tags.length > 0 ? (
                    <span className={styles.entryTags}>{entry.tags.join(" · ")}</span>
                  ) : null}

                  {open ? (
                    <div className={styles.previewBox}>
                      {thumb ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only, mixed hosts */}
                          <img src={thumb} alt="" className={styles.previewImg} />
                          <a
                            href={entry.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.recentLink}
                          >
                            {isPdfAttachment(entry.imageUrl) ? "Open PDF ↗" : "Open image ↗"}
                          </a>
                        </>
                      ) : isStoredAttachment(entry.imageUrl) ? (
                        <a
                          href={entry.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.recentLink}
                        >
                          Open attachment ↗
                        </a>
                      ) : (
                        <span className={styles.hint}>No attachment.</span>
                      )}
                    </div>
                  ) : null}

                  {confirming ? (
                    <div className={styles.rowActions}>
                      <span className={styles.confirmText}>Delete permanently?</span>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => doDelete(entry.id)}
                        disabled={rowBusy}
                      >
                        {rowBusy ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setConfirmId(null)}
                        disabled={rowBusy}
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setPreviewId(open ? null : entry.id)}
                      >
                        {open ? "Hide" : "Preview"}
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => onEdit(entry)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.dangerLinkBtn}
                        onClick={() => {
                          setError("");
                          setConfirmId(entry.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

"use client";

import { useCallback, useEffect, useId, useState, type ChangeEvent, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { createEntry, NotAuthenticatedError, uploadLogFile } from "@/lib/admin";
import { fetchLogEntries } from "@/lib/log";
import { formatLogDate } from "@/lib/format";
import type { LogEntry } from "@/lib/types";
import styles from "./LogEntryForm.module.css";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const PDF_TYPE = "application/pdf";
const TAG_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;

type Status = "idle" | "working" | "done" | "error";

interface Errors {
  file?: string;
  title?: string;
  description?: string;
  date?: string;
  tags?: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function LogEntryForm({ onSessionExpired }: { onSessionExpired: () => void }) {
  const uid = useId();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tagsRaw, setTagsRaw] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<LogEntry[]>([]);

  const loadRecent = useCallback(() => {
    fetchLogEntries()
      .then((entries) => setRecent(entries.slice(0, 5)))
      .catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      // Only images get an inline <img> preview; a PDF just shows its name.
      return next && next.type !== PDF_TYPE ? URL.createObjectURL(next) : null;
    });
    setFile(next);
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!file) next.file = "Choose an image or PDF.";
    else if (!ACCEPT.split(",").includes(file.type))
      next.file = "Use a JPEG, PNG, WebP, or PDF.";
    else if (file.size > MAX_UPLOAD_BYTES) next.file = "File must be 10 MB or smaller.";

    if (!title.trim()) next.title = "Required.";
    else if (title.trim().length > 120) next.title = "Keep it under 120 characters.";

    if (!description.trim()) next.description = "Required.";
    else if (description.trim().length > 2000) next.description = "Keep it under 2000 characters.";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Use YYYY-MM-DD.";
    else if (Date.parse(`${date}T00:00:00Z`) > Date.now() + 36 * 3600 * 1000)
      next.date = "That date is in the future.";

    const tags = parseTags(tagsRaw);
    if (tags.length > 8) next.tags = "At most 8 tags.";
    else if (tags.some((t) => !TAG_RE.test(t)))
      next.tags = "Tags must be short slugs (a–z, 0–9, -).";

    return next;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "working") return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !file) return;

    setStatus("working");
    setMessage("Uploading file…");

    let imageUrl: string;
    try {
      imageUrl = await uploadLogFile(file);
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setStatus("error");
      setMessage(
        err instanceof BackendError
          ? `Upload failed: ${err.message}`
          : "Upload failed. Check the file and try again.",
      );
      return;
    }

    setMessage("Saving entry…");
    try {
      await createEntry({
        title: title.trim(),
        description: description.trim(),
        date,
        imageUrl,
        tags: parseTags(tagsRaw),
      });
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setStatus("error");
      setMessage(
        `The file uploaded but saving the entry failed${
          err instanceof BackendError ? ` (${err.message})` : ""
        }. Nothing was half-saved — adjust and submit again.`,
      );
      return;
    }

    setStatus("done");
    setMessage("Entry added to the log.");
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setFile(null);
    setTitle("");
    setDescription("");
    setTagsRaw("");
    setDate(todayISO());
    setErrors({});
    loadRecent();
  }

  const busy = status === "working";

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <fieldset className={styles.fieldset} disabled={busy}>
          <legend className={styles.legend}>New entry</legend>

          <div className={styles.field}>
            <label htmlFor={`${uid}-image`}>Image or PDF</label>
            <input
              id={`${uid}-image`}
              type="file"
              accept={ACCEPT}
              onChange={onFileChange}
              aria-describedby={errors.file ? `${uid}-image-err` : `${uid}-image-hint`}
            />
            <p id={`${uid}-image-hint`} className={styles.hint}>
              JPEG, PNG, WebP, or PDF — up to 10 MB.
            </p>
            {errors.file ? (
              <p id={`${uid}-image-err`} className={styles.error}>
                {errors.file}
              </p>
            ) : null}
            {file && file.type === PDF_TYPE ? (
              <p className={styles.fileName}>{file.name}</p>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- transient local object-URL preview
              <img src={previewUrl} alt="Selected image preview" className={styles.preview} />
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}-title`}>Title</label>
            <input
              id={`${uid}-title`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? `${uid}-title-err` : undefined}
            />
            {errors.title ? (
              <p id={`${uid}-title-err`} className={styles.error}>
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}-desc`}>Description</label>
            <textarea
              id={`${uid}-desc`}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? `${uid}-desc-err` : undefined}
            />
            {errors.description ? (
              <p id={`${uid}-desc-err`} className={styles.error}>
                {errors.description}
              </p>
            ) : null}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor={`${uid}-date`}>Date</label>
              <input
                id={`${uid}-date`}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? `${uid}-date-err` : undefined}
              />
              {errors.date ? (
                <p id={`${uid}-date-err`} className={styles.error}>
                  {errors.date}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor={`${uid}-tags`}>Tags</label>
              <input
                id={`${uid}-tags`}
                type="text"
                value={tagsRaw}
                placeholder="milestone, backend"
                onChange={(e) => setTagsRaw(e.target.value)}
                aria-invalid={errors.tags ? true : undefined}
                aria-describedby={errors.tags ? `${uid}-tags-err` : `${uid}-tags-hint`}
              />
              <p id={`${uid}-tags-hint`} className={styles.hint}>
                Comma-separated, max 8.
              </p>
              {errors.tags ? (
                <p id={`${uid}-tags-err`} className={styles.error}>
                  {errors.tags}
                </p>
              ) : null}
            </div>
          </div>

          <button type="submit" className="button">
            {busy ? "Working…" : "Add entry"}
          </button>
        </fieldset>

        <p
          role="status"
          aria-live="polite"
          className={[
            styles.status,
            status === "done" ? styles.statusOk : "",
            status === "error" ? styles.statusBad : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {message}
        </p>
      </form>

      <aside className={styles.recent}>
        <h2 className={styles.recentTitle}>Recent entries</h2>
        {recent.length === 0 ? (
          <p className={styles.hint}>None yet.</p>
        ) : (
          <ul className={styles.recentList}>
            {recent.map((entry) => (
              <li key={entry.id}>
                <span className={styles.recentDate}>{formatLogDate(entry.date)}</span>
                <span>{entry.title}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

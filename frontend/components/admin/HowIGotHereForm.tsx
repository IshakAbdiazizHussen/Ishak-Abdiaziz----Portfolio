"use client";

import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { getContent, updateContent, uploadContentImage, NotAuthenticatedError } from "@/lib/admin";
import type { HowIGotHereContent } from "@/lib/types";
import { SavedIndicator, type SaveStatus } from "./SavedIndicator";
import styles from "./ContentForm.module.css";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface Errors {
  body?: string;
  photo?: string;
}

/** `GET`/`PUT /api/content/how-i-got-here` — body text, photo. */
export function HowIGotHereForm({ onSessionExpired }: { onSessionExpired: () => void }) {
  const uid = useId();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getContent<HowIGotHereContent>("how-i-got-here")
      .then((data) => {
        setBody(data.body);
        setPhotoUrl(data.photoUrl);
        setLoaded(true);
      })
      .catch(() => setLoadError("Couldn't load How I Got Here content. Is the backend running?"));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next);
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!body.trim()) next.body = "Required.";
    else if (body.trim().length > 4000) next.body = "Keep it under 4000 characters.";

    if (file) {
      if (!ACCEPT.split(",").includes(file.type)) next.photo = "Use a JPEG, PNG, or WebP.";
      else if (file.size > MAX_IMAGE_BYTES) next.photo = "Image must be 5 MB or smaller.";
    }
    return next;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "working") return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("working");
    setMessage(file ? "Uploading photo…" : "Saving…");

    let nextPhotoUrl = photoUrl;
    if (file) {
      try {
        nextPhotoUrl = await uploadContentImage(file);
      } catch (err) {
        if (err instanceof NotAuthenticatedError) return onSessionExpired();
        setStatus("error");
        setMessage(
          err instanceof BackendError ? `Photo upload failed: ${err.message}` : "Photo upload failed.",
        );
        return;
      }
      setMessage("Saving…");
    }

    try {
      const updated = await updateContent<HowIGotHereContent>("how-i-got-here", {
        body: body.trim(),
        photoUrl: nextPhotoUrl,
      });
      setBody(updated.body);
      setPhotoUrl(updated.photoUrl);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      setFile(null);
      setErrors({});
      setStatus("done");
      setMessage("Saved.");
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setStatus("error");
      setMessage(err instanceof BackendError ? err.message : "Couldn't save. Try again.");
    }
  }

  if (loadError) return <p className={styles.error}>{loadError}</p>;
  if (!loaded) return <p className={styles.notice}>Loading…</p>;

  const busy = status === "working";
  const displayPhoto = previewUrl ?? photoUrl;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.fieldset} disabled={busy}>
        <div className={styles.field}>
          <label htmlFor={`${uid}-body`}>Body</label>
          <textarea
            id={`${uid}-body`}
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? `${uid}-body-err` : undefined}
          />
          {errors.body ? (
            <p id={`${uid}-body-err`} className={styles.error}>
              {errors.body}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${uid}-photo`}>Photo</label>
          <input
            id={`${uid}-photo`}
            type="file"
            accept={ACCEPT}
            onChange={onFileChange}
            aria-describedby={errors.photo ? `${uid}-photo-err` : undefined}
          />
          {errors.photo ? (
            <p id={`${uid}-photo-err`} className={styles.error}>
              {errors.photo}
            </p>
          ) : null}
          {displayPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview, remote or local blob URL
            <img src={displayPhoto} alt="Photo preview" className={styles.preview} />
          ) : null}
        </div>

        <button type="submit" className="button">
          {busy ? "Saving…" : "Save"}
        </button>
      </fieldset>
      <SavedIndicator status={status} message={message} />
    </form>
  );
}

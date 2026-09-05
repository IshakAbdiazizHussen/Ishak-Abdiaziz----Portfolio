"use client";

import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { getContent, updateContent, uploadContentImage, NotAuthenticatedError } from "@/lib/admin";
import type { IntroContent } from "@/lib/types";
import { SavedIndicator, type SaveStatus } from "./SavedIndicator";
import styles from "./ContentForm.module.css";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface Errors {
  headline?: string;
  subheadline?: string;
  photo?: string;
}

/** `GET`/`PUT /api/content/intro` — headline, sub-headline, hero photo. */
export function IntroForm({ onSessionExpired }: { onSessionExpired: () => void }) {
  const uid = useId();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [photoUrl, setPhotoUrl] = useState(""); // last-saved remote URL
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getContent<IntroContent>("intro")
      .then((data) => {
        setHeadline(data.headline);
        setSubheadline(data.subheadline);
        setPhotoUrl(data.heroPhotoUrl);
        setLoaded(true);
      })
      .catch(() => setLoadError("Couldn't load Intro content. Is the backend running?"));
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
    if (!headline.trim()) next.headline = "Required.";
    else if (headline.trim().length > 200) next.headline = "Keep it under 200 characters.";

    if (!subheadline.trim()) next.subheadline = "Required.";
    else if (subheadline.trim().length > 600) next.subheadline = "Keep it under 600 characters.";

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
      const updated = await updateContent<IntroContent>("intro", {
        headline: headline.trim(),
        subheadline: subheadline.trim(),
        heroPhotoUrl: nextPhotoUrl,
      });
      setHeadline(updated.headline);
      setSubheadline(updated.subheadline);
      setPhotoUrl(updated.heroPhotoUrl);
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
          <label htmlFor={`${uid}-headline`}>Headline</label>
          <input
            id={`${uid}-headline`}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            aria-invalid={errors.headline ? true : undefined}
            aria-describedby={errors.headline ? `${uid}-headline-err` : undefined}
          />
          {errors.headline ? (
            <p id={`${uid}-headline-err`} className={styles.error}>
              {errors.headline}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${uid}-sub`}>Sub-headline</label>
          <textarea
            id={`${uid}-sub`}
            rows={3}
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            aria-invalid={errors.subheadline ? true : undefined}
            aria-describedby={errors.subheadline ? `${uid}-sub-err` : undefined}
          />
          {errors.subheadline ? (
            <p id={`${uid}-sub-err`} className={styles.error}>
              {errors.subheadline}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${uid}-photo`}>Hero photo</label>
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
            <img src={displayPhoto} alt="Hero photo preview" className={styles.preview} />
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

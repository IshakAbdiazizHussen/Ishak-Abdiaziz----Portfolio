"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { getContent, updateContent, NotAuthenticatedError } from "@/lib/admin";
import type { LetsTalkContent } from "@/lib/types";
import { SavedIndicator, type SaveStatus } from "./SavedIndicator";
import styles from "./ContentForm.module.css";

interface Errors {
  email?: string;
  githubUrl?: string;
  linkedinUrl?: string;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** `GET`/`PUT /api/content/lets-talk` — email, GitHub URL, LinkedIn URL. No image field. */
export function LetsTalkForm({ onSessionExpired }: { onSessionExpired: () => void }) {
  const uid = useId();

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [email, setEmail] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getContent<LetsTalkContent>("lets-talk")
      .then((data) => {
        setEmail(data.email);
        setGithubUrl(data.githubUrl);
        setLinkedinUrl(data.linkedinUrl);
        setLoaded(true);
      })
      .catch(() => setLoadError("Couldn't load Let's Talk content. Is the backend running?"));
  }, []);

  function validate(): Errors {
    const next: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email.";
    if (!isHttpsUrl(githubUrl.trim())) next.githubUrl = "Enter a valid https URL.";
    if (!isHttpsUrl(linkedinUrl.trim())) next.linkedinUrl = "Enter a valid https URL.";
    return next;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "working") return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus("working");
    setMessage("Saving…");

    try {
      const updated = await updateContent<LetsTalkContent>("lets-talk", {
        email: email.trim(),
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
      });
      setEmail(updated.email);
      setGithubUrl(updated.githubUrl);
      setLinkedinUrl(updated.linkedinUrl);
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

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.fieldset} disabled={busy}>
        <div className={styles.field}>
          <label htmlFor={`${uid}-email`}>Email</label>
          <input
            id={`${uid}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${uid}-email-err` : undefined}
          />
          {errors.email ? (
            <p id={`${uid}-email-err`} className={styles.error}>
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${uid}-github`}>GitHub URL</label>
          <input
            id={`${uid}-github`}
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            aria-invalid={errors.githubUrl ? true : undefined}
            aria-describedby={errors.githubUrl ? `${uid}-github-err` : undefined}
          />
          {errors.githubUrl ? (
            <p id={`${uid}-github-err`} className={styles.error}>
              {errors.githubUrl}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${uid}-linkedin`}>LinkedIn URL</label>
          <input
            id={`${uid}-linkedin`}
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            aria-invalid={errors.linkedinUrl ? true : undefined}
            aria-describedby={errors.linkedinUrl ? `${uid}-linkedin-err` : undefined}
          />
          {errors.linkedinUrl ? (
            <p id={`${uid}-linkedin-err`} className={styles.error}>
              {errors.linkedinUrl}
            </p>
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

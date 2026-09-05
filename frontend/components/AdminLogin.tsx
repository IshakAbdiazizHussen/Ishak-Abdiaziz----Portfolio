"use client";

import { useId, useState, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { login } from "@/lib/admin";
import styles from "./AdminLogin.module.css";

/**
 * The /admin login screen: one small card — heading, password field, submit —
 * centred on the site's normal background, built from the same tokens and the
 * same mono-label / sans-button split as `ContactForm`. The form posts nothing
 * but a password to the existing `POST /api/admin/login` (single shared
 * password, no accounts, no recovery), and a correct password proceeds
 * straight to the unchanged sidebar/dashboard via `onAuthed`.
 */
export function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const uid = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;

    setBusy(true);
    setError("");
    try {
      await login(password);
      setPassword("");
      onAuthed();
    } catch (err) {
      if (err instanceof BackendError && err.status === 429) {
        setError("Too many attempts — wait a minute and try again.");
      } else if (err instanceof BackendError && err.status === 503) {
        setError("The auth service is unavailable right now.");
      } else if (err instanceof BackendError && err.status === 401) {
        setError("Incorrect password.");
      } else {
        setError("Couldn't sign in. Is the backend running?");
      }
      setBusy(false);
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={onSubmit}>
        <h1 className={styles.legend}>Admin Login</h1>
        <div className={styles.field}>
          <label htmlFor={`${uid}-pw`}>Password</label>
          <input
            id={`${uid}-pw`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${uid}-err` : undefined}
          />
          {error ? (
            <p id={`${uid}-err`} className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

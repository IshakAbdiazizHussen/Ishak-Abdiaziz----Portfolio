"use client";

import { useId, useState, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { login } from "@/lib/admin";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AdminLogin.module.css";

/**
 * The /admin login screen. Deliberately a softer, rounded, two-column layout —
 * an acknowledged departure from the public site's sharp-edged design system,
 * scoped only to this screen. The form still posts nothing but a password to
 * the existing `POST /api/admin/login` (single shared password, no user
 * accounts, no recovery flow), and a correct password proceeds straight to the
 * unchanged sidebar/dashboard via `onAuthed`.
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
      <div className={styles.container}>
        <div className={styles.themeSlot}>
          <ThemeToggle />
        </div>

        <p className={styles.eyebrow}>Admin</p>
        <h1 className={styles.headline}>
          Manage the site&apos;s content
          <br />
          without touching code
        </h1>
        <p className={styles.lede}>
          Sign in to edit the words on every page, the project stats, the toolbox and the
          log — served straight from the database. The layout and visual design stay in the
          code.
        </p>

        <div className={styles.columns}>
          <aside className={styles.infoCard}>
            <h2 className={styles.infoTitle}>What this panel manages</h2>
            <ul className={styles.infoList}>
              <li>Edit Intro (headline, sub-headline, hero photo)</li>
              <li>Edit Built (both projects, including stats with confirm-before-save)</li>
              <li>Edit How I Got Here</li>
              <li>Edit Toolbox groups and items</li>
              <li>Add Log entries with images</li>
              <li>Edit Let&apos;s Talk contact links</li>
            </ul>
          </aside>

          <div className={styles.loginCard}>
            <h2 className={styles.loginTitle}>Admin Login</h2>
            <form className={styles.form} onSubmit={onSubmit}>
              <label htmlFor={`${uid}-pw`} className={styles.label}>
                Password
              </label>
              <input
                id={`${uid}-pw`}
                className={styles.input}
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
              <button type="submit" className={styles.submit} disabled={busy}>
                {busy ? "Signing in…" : "Open Dashboard"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

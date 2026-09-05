"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminLogin } from "./AdminLogin";
import { AdminSidebar } from "./AdminSidebar";
import { checkSession, logout } from "@/lib/admin";
import { AdminSessionProvider } from "@/lib/admin-session";
import styles from "./AdminShell.module.css";

type AuthState = "unknown" | "anon" | "authed" | "unreachable";

/**
 * The one place `/admin` decides "logged in or not" (feature 16). One
 * `GET /api/admin/session` check on mount gates every section route beneath
 * it — individual section pages never re-check this themselves.
 *
 * While `unknown` or `anon`, NOTHING but a status message / the login form is
 * rendered — not the sidebar, not `children`. The sidebar and the requested
 * section only ever render once the session check has actually come back
 * `200`.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>("unknown");

  const refreshAuth = useCallback(() => {
    checkSession()
      .then((ok) => setAuth(ok ? "authed" : "anon"))
      .catch(() => setAuth("unreachable"));
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const handleLogout = useCallback(() => {
    logout().finally(() => setAuth("anon"));
  }, []);

  // A write call from any section page came back 401 mid-session — drop to
  // login exactly like an expired session discovered on mount would.
  const signalExpired = useCallback(() => setAuth("anon"), []);

  if (auth === "unknown") {
    return (
      <div className={styles.center}>
        <p className={styles.notice}>Checking session…</p>
      </div>
    );
  }

  if (auth === "unreachable") {
    return (
      <div className={styles.center}>
        <p className={styles.notice}>
          Can&apos;t reach the server. Is the backend running?{" "}
          <button type="button" className={styles.retry} onClick={refreshAuth}>
            Retry
          </button>
        </p>
      </div>
    );
  }

  if (auth === "anon") {
    return <AdminLogin onAuthed={() => setAuth("authed")} />;
  }

  return (
    <AdminSessionProvider value={{ signalExpired }}>
      <div className={styles.shell}>
        <AdminSidebar onLogout={handleLogout} />
        <div className={styles.content}>{children}</div>
      </div>
    </AdminSessionProvider>
  );
}

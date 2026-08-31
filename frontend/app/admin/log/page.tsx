"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/Container";
import { PageHeader } from "@/components/PageHeader";
import { AdminLogin } from "@/components/AdminLogin";
import { LogEntryForm } from "@/components/LogEntryForm";
import { checkSession, logout } from "@/lib/admin";
import styles from "./admin-log.module.css";

type AuthState = "unknown" | "anon" | "authed" | "unreachable";

export default function AdminLogPage() {
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

  return (
    <Container>
      <PageHeader
        kicker="Admin"
        title="Log admin"
        intro="Single-owner. Add entries to the public Log."
      />

      {auth === "unknown" ? (
        <p className={styles.notice}>Checking session…</p>
      ) : auth === "unreachable" ? (
        <p className={styles.notice}>
          Can&apos;t reach the server. Is the backend running?{" "}
          <button type="button" className={styles.retry} onClick={refreshAuth}>
            Retry
          </button>
        </p>
      ) : auth === "anon" ? (
        <AdminLogin onAuthed={() => setAuth("authed")} />
      ) : (
        <>
          <div className={styles.bar}>
            <button type="button" className="button-ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
          <LogEntryForm onSessionExpired={() => setAuth("anon")} />
        </>
      )}
    </Container>
  );
}

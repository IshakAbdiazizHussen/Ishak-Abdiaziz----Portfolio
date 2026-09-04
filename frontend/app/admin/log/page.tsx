"use client";

import { LogEntryForm } from "@/components/LogEntryForm";
import { useAdminSession } from "@/lib/admin-session";
import styles from "./admin-log.module.css";

/**
 * Log section, moved under the shared /admin sidebar shell (feature 16).
 * `LogEntryForm` itself is untouched from feature 10 — only the auth-gating
 * and login-screen chrome that used to live here moved up into
 * `AdminShell`/`app/admin/layout.tsx`.
 */
export default function AdminLogPage() {
  const { signalExpired } = useAdminSession();

  return (
    <div>
      <h1 className={styles.heading}>Log</h1>
      <p className={styles.intro}>Add entries to the public Log.</p>
      <LogEntryForm onSessionExpired={signalExpired} />
    </div>
  );
}

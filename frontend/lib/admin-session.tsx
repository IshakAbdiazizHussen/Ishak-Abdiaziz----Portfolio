"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Lets any section page (a child of `AdminShell`, which owns the actual auth
 * state) report "my session just expired" back up to the shell without
 * re-checking `GET /api/admin/session` itself — auth-gating happens exactly
 * once, in the shell (feature 16 Guidelines).
 */
interface AdminSessionValue {
  /** Call after any admin call comes back 401 mid-session — drops to login. */
  signalExpired: () => void;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({
  value,
  children,
}: {
  value: AdminSessionValue;
  children: ReactNode;
}) {
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

/** Every /admin/* page renders inside AdminShell, so this is always available there. */
export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within AdminShell");
  }
  return ctx;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/AdminShell";

/**
 * Everything under /admin is single-owner and must never be indexed. A
 * Server Component so this `metadata` export is valid — it applies to every
 * route nested under /admin (all six sections), not just /admin/log.
 *
 * The actual auth-gating and sidebar live in `AdminShell`, a client
 * component: one `GET /api/admin/session` check here gates every section
 * route beneath it (constraint C5) — individual section pages never
 * re-check it themselves.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

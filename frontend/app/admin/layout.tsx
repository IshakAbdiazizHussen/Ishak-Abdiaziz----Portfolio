import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Everything under /admin is single-owner and must never be indexed. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}

import { redirect } from "next/navigation";

/**
 * Bare /admin has no content of its own — redirect to the Log section.
 * (Owner's-preference choice per feature 16; documented in README.md.)
 */
export default function AdminIndexPage() {
  redirect("/admin/log");
}

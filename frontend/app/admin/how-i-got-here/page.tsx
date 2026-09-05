"use client";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { HowIGotHereForm } from "@/components/admin/HowIGotHereForm";
import { useAdminSession } from "@/lib/admin-session";

export default function AdminHowIGotHerePage() {
  const { signalExpired } = useAdminSession();

  return (
    <div>
      <AdminSectionHeader title="How I Got Here" intro="Body text and photo." />
      <HowIGotHereForm onSessionExpired={signalExpired} />
    </div>
  );
}

"use client";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { LetsTalkForm } from "@/components/admin/LetsTalkForm";
import { useAdminSession } from "@/lib/admin-session";

export default function AdminLetsTalkPage() {
  const { signalExpired } = useAdminSession();

  return (
    <div>
      <AdminSectionHeader title="Let's Talk" intro="Contact links shown on the public page." />
      <LetsTalkForm onSessionExpired={signalExpired} />
    </div>
  );
}

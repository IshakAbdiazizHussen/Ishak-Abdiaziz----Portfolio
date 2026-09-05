"use client";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { IntroForm } from "@/components/admin/IntroForm";
import { useAdminSession } from "@/lib/admin-session";

export default function AdminIntroPage() {
  const { signalExpired } = useAdminSession();

  return (
    <div>
      <AdminSectionHeader title="Intro" intro="Headline, sub-headline, and hero photo." />
      <IntroForm onSessionExpired={signalExpired} />
    </div>
  );
}

"use client";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { ToolboxEditor } from "@/components/admin/ToolboxEditor";
import { useAdminSession } from "@/lib/admin-session";

export default function AdminToolboxPage() {
  const { signalExpired } = useAdminSession();

  return (
    <div>
      <AdminSectionHeader title="Toolbox" intro="Groups and tools shown on the public page." />
      <ToolboxEditor onSessionExpired={signalExpired} />
    </div>
  );
}

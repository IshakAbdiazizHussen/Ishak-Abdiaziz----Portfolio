"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import { getProjects } from "@/lib/admin";
import { useAdminSession } from "@/lib/admin-session";
import type { Project } from "@/lib/types";
import styles from "./admin-built.module.css";

export default function AdminBuiltPage() {
  const { signalExpired } = useAdminSession();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(() => {
    getProjects()
      .then(setProjects)
      .catch(() => setLoadError("Couldn't load projects. Is the backend running?"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <AdminSectionHeader title="Built" intro="The two projects, their fields, and their stats." />
      {loadError ? (
        <p className={styles.error}>{loadError}</p>
      ) : !projects ? (
        <p className={styles.notice}>Loading…</p>
      ) : (
        projects.map((project) => (
          <ProjectEditor key={project.id} project={project} onSessionExpired={signalExpired} />
        ))
      )}
    </div>
  );
}

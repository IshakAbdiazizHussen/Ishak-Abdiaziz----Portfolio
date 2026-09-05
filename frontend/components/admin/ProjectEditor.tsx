"use client";

import { useId, useState, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { updateProject, NotAuthenticatedError, type UpdateProjectFields } from "@/lib/admin";
import type { Project, ProjectStat } from "@/lib/types";
import { ProjectStatEditor } from "./ProjectStatEditor";
import { AddStatForm } from "./AddStatForm";
import { SavedIndicator, type SaveStatus } from "./SavedIndicator";
import styles from "./ProjectEditor.module.css";

/**
 * One project: its non-stat fields as a plain form (`PUT /api/projects/:id`,
 * no `previousValue` involved — C18 scopes that to stats only), plus its
 * stats list, each stat its own `ProjectStatEditor`.
 */
export function ProjectEditor({
  project,
  onSessionExpired,
}: {
  project: Project;
  onSessionExpired: () => void;
}) {
  const uid = useId();

  const [name, setName] = useState(project.name);
  const [lead, setLead] = useState(project.lead);
  const [stackRaw, setStackRaw] = useState(project.stack.join(", "));
  const [hook, setHook] = useState(project.hook);
  const [whatItDoes, setWhatItDoes] = useState(project.whatItDoes);
  const [statsLabel, setStatsLabel] = useState(project.statsLabel);
  const [demoUrl, setDemoUrl] = useState(project.demoUrl);
  const [demoLabel, setDemoLabel] = useState(project.demoLabel);
  const [sourceUrl, setSourceUrl] = useState(project.sourceUrl);

  const [stats, setStats] = useState<ProjectStat[]>(project.stats);

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "working") return;

    if (!name.trim() || !hook.trim() || !whatItDoes.trim() || !statsLabel.trim()) {
      setStatus("error");
      setMessage("Name, hook, what-it-does, and the stats label are required.");
      return;
    }

    setStatus("working");
    setMessage("Saving…");

    const fields: UpdateProjectFields = {
      name: name.trim(),
      lead,
      stack: stackRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      hook: hook.trim(),
      whatItDoes: whatItDoes.trim(),
      statsLabel: statsLabel.trim(),
      demoUrl: demoUrl.trim(),
      demoLabel: demoLabel.trim(),
      sourceUrl: sourceUrl.trim(),
    };

    try {
      const updated = await updateProject(project.id, fields);
      setName(updated.name);
      setLead(updated.lead);
      setStackRaw(updated.stack.join(", "));
      setHook(updated.hook);
      setWhatItDoes(updated.whatItDoes);
      setStatsLabel(updated.statsLabel);
      setDemoUrl(updated.demoUrl);
      setDemoLabel(updated.demoLabel);
      setSourceUrl(updated.sourceUrl);
      setStatus("done");
      setMessage("Saved.");
    } catch (err) {
      if (err instanceof NotAuthenticatedError) {
        onSessionExpired();
        return;
      }
      setStatus("error");
      setMessage(err instanceof BackendError ? err.message : "Couldn't save. Try again.");
    }
  }

  const busy = status === "working";

  return (
    <section className={styles.project}>
      <h2 className={styles.name}>{project.name}</h2>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <fieldset className={styles.fieldset} disabled={busy}>
          <div className={styles.field}>
            <label htmlFor={`${uid}-name`}>Name</label>
            <input id={`${uid}-name`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <label className={styles.checkboxField}>
            <input type="checkbox" checked={lead} onChange={(e) => setLead(e.target.checked)} />
            <span>Lead project badge</span>
          </label>

          <div className={styles.field}>
            <label htmlFor={`${uid}-stack`}>Stack (comma-separated)</label>
            <input
              id={`${uid}-stack`}
              value={stackRaw}
              onChange={(e) => setStackRaw(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}-hook`}>Hook</label>
            <textarea id={`${uid}-hook`} rows={2} value={hook} onChange={(e) => setHook(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}-what`}>What it does</label>
            <textarea
              id={`${uid}-what`}
              rows={4}
              value={whatItDoes}
              onChange={(e) => setWhatItDoes(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}-statslabel`}>Stats panel label</label>
            <input
              id={`${uid}-statslabel`}
              value={statsLabel}
              onChange={(e) => setStatsLabel(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor={`${uid}-demourl`}>Demo URL</label>
              <input
                id={`${uid}-demourl`}
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${uid}-demolabel`}>Demo button label</label>
              <input
                id={`${uid}-demolabel`}
                value={demoLabel}
                onChange={(e) => setDemoLabel(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}-sourceurl`}>Source URL</label>
            <input
              id={`${uid}-sourceurl`}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <button type="submit" className="button">
            {busy ? "Saving…" : "Save"}
          </button>
        </fieldset>
        <SavedIndicator status={status} message={message} />
      </form>

      <div className={styles.stats}>
        <h3 className={styles.statsHeading}>Stats</h3>
        <ul className={styles.statsList}>
          {stats.map((stat) => (
            <ProjectStatEditor
              key={stat.id}
              projectId={project.id}
              stat={stat}
              onUpdated={(updated) =>
                setStats((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
              }
              onSessionExpired={onSessionExpired}
            />
          ))}
          <AddStatForm
            projectId={project.id}
            onCreated={(created) => setStats((prev) => [...prev, created])}
            onSessionExpired={onSessionExpired}
          />
        </ul>
      </div>
    </section>
  );
}

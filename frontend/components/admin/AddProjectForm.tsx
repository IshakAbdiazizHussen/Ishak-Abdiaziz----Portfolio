"use client";

import { useId, useState, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import { createProject, NotAuthenticatedError, type NewProjectInput } from "@/lib/admin";
import { SavedIndicator, type SaveStatus } from "./SavedIndicator";
import styles from "./ProjectEditor.module.css";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;

/**
 * "+ Add a new project" — creates a brand-new row via `POST /api/projects`.
 * Deliberately styled and laid out exactly like `ProjectEditor`'s edit form
 * (same CSS module, same field set) rather than a separate design, plus one
 * extra field — Slug — which only exists at creation time; it's the row's
 * permanent identifier and isn't editable afterward.
 *
 * The new project has no stats yet (constraint C18 — there's nothing yet
 * stored to confirm a stat against). After creation this form resets and the
 * parent reloads the list, so the new project appears below as its own
 * `ProjectEditor` card with the same "+ Add stat" control every other
 * project already uses.
 */
export function AddProjectForm({
  nextSortOrder,
  onCreated,
  onSessionExpired,
}: {
  /** Sort order for the new row — keeps it appended after the existing projects. */
  nextSortOrder: number;
  onCreated: () => void;
  onSessionExpired: () => void;
}) {
  const uid = useId();

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [lead, setLead] = useState(false);
  const [stackRaw, setStackRaw] = useState("");
  const [hook, setHook] = useState("");
  const [whatItDoes, setWhatItDoes] = useState("");
  const [statsLabel, setStatsLabel] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [demoLabel, setDemoLabel] = useState("Try it live");
  const [sourceUrl, setSourceUrl] = useState("");

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  function reset() {
    setSlug("");
    setName("");
    setLead(false);
    setStackRaw("");
    setHook("");
    setWhatItDoes("");
    setStatsLabel("");
    setDemoUrl("");
    setDemoLabel("Try it live");
    setSourceUrl("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "working") return;

    const trimmedSlug = slug.trim().toLowerCase();
    if (!SLUG_RE.test(trimmedSlug)) {
      setStatus("error");
      setMessage("Slug must be lowercase letters, numbers, and hyphens (e.g. my-new-project).");
      return;
    }
    if (!name.trim() || !hook.trim() || !whatItDoes.trim() || !statsLabel.trim()) {
      setStatus("error");
      setMessage("Name, hook, what-it-does, and the stats label are required.");
      return;
    }
    if (!demoUrl.trim() || !sourceUrl.trim()) {
      setStatus("error");
      setMessage("Demo URL and source URL are required.");
      return;
    }

    setStatus("working");
    setMessage("Adding…");

    const input: NewProjectInput = {
      slug: trimmedSlug,
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
      demoLabel: demoLabel.trim() || "Try it live",
      sourceUrl: sourceUrl.trim(),
      sortOrder: nextSortOrder,
    };

    try {
      await createProject(input);
      reset();
      setStatus("done");
      setMessage("Project added — give it its stats below.");
      onCreated();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) {
        onSessionExpired();
        return;
      }
      setStatus("error");
      setMessage(
        err instanceof BackendError ? err.message : "Couldn't add the project. Try again.",
      );
    }
  }

  const busy = status === "working";

  return (
    <section className={styles.project}>
      <h2 className={styles.name}>+ Add a new project</h2>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <fieldset className={styles.fieldset} disabled={busy}>
          <div className={styles.field}>
            <label htmlFor={`${uid}-slug`}>Slug</label>
            <input
              id={`${uid}-slug`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. my-new-project"
            />
          </div>

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
            <textarea
              id={`${uid}-hook`}
              rows={2}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
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
            {busy ? "Adding…" : "+ Add project"}
          </button>
        </fieldset>
        <SavedIndicator status={status} message={message} />
      </form>
    </section>
  );
}

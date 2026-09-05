import { backendFetch, BackendError } from "./backend";
import type {
  IntroContent,
  HowIGotHereContent,
  LetsTalkContent,
  Project,
  ProjectStat,
  ToolboxGroup,
  ToolboxItem,
} from "./types";

/**
 * The single path to every admin endpoint. All WRITE calls use `auth: true`
 * (`credentials: "include"`) so the HttpOnly `sid` cookie rides along — the
 * frontend never reads that cookie and never stores a token. The content
 * GETs (`getContent`, `getProjects`, `getToolbox`) are public endpoints —
 * `auth: false` — matching the backend's design (feature 13–15): reading
 * this content requires no session at all, only writing it does.
 */

/** Thrown when an authed call comes back 401 (session missing/expired). */
export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "NotAuthenticatedError";
  }
}

/**
 * Thrown specifically by `updateStat` on a 409 — constraint C18's backend
 * concurrency check rejected the write because `previousValue` was stale.
 * Carries the row's REAL current value (read straight off the same 409
 * response the backend already computed atomically — never a second
 * `GET /api/projects` call, which could itself race).
 */
export class StatConflictError extends Error {
  constructor(readonly currentValue: string) {
    super("Stat has changed since it was loaded");
    this.name = "StatConflictError";
  }
}

function mapAuthed(err: unknown): never {
  if (err instanceof BackendError && err.status === 401) throw new NotAuthenticatedError();
  throw err;
}

function hasCurrentValue(body: unknown): body is { currentValue: string } {
  return (
    !!body &&
    typeof body === "object" &&
    "currentValue" in body &&
    typeof (body as { currentValue: unknown }).currentValue === "string"
  );
}

/** Same as `mapAuthed`, plus maps a 409 (stale previousValue) to `StatConflictError`. */
function mapStatWrite(err: unknown): never {
  if (err instanceof BackendError && err.status === 401) throw new NotAuthenticatedError();
  if (err instanceof BackendError && err.status === 409 && hasCurrentValue(err.body)) {
    throw new StatConflictError(err.body.currentValue);
  }
  throw err;
}

/** True if a valid session exists. Re-throws non-401 failures (backend down). */
export async function checkSession(): Promise<boolean> {
  try {
    await backendFetch("/api/admin/session", { auth: true });
    return true;
  } catch (err) {
    if (err instanceof BackendError && err.status === 401) return false;
    throw err;
  }
}

/** Throws BackendError on failure (401 = wrong password, 429 = rate limited). */
export async function login(password: string): Promise<void> {
  await backendFetch("/api/admin/login", {
    auth: true,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

/** Best effort — the UI drops to the login screen regardless of the outcome. */
export async function logout(): Promise<void> {
  try {
    await backendFetch("/api/admin/logout", { auth: true, method: "POST" });
  } catch {
    /* ignore */
  }
}

export interface NewEntryInput {
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  tags: string[];
}

/**
 * `POST /api/log/upload` — a Log attachment: a JPEG/PNG/WebP image or a PDF
 * (plots and reports are often exported as PDF), up to 10 MB. Returns the
 * stored URL to pass into `createEntry` as `imageUrl` — the field keeps that
 * name whether the URL points at an image or a PDF.
 */
export async function uploadLogFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  try {
    // No Content-Type header — the browser sets the multipart boundary.
    const res = await backendFetch<{ imageUrl: string }>("/api/log/upload", {
      auth: true,
      method: "POST",
      body: form,
    });
    return res.imageUrl;
  } catch (err) {
    mapAuthed(err);
  }
}

export async function createEntry(input: NewEntryInput): Promise<void> {
  try {
    await backendFetch("/api/log", {
      auth: true,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (err) {
    mapAuthed(err);
  }
}

// ---- Content areas: Intro, How I Got Here, Let's Talk (feature 17) ----

export type ContentArea = "intro" | "how-i-got-here" | "lets-talk";

/** `GET /api/content/:area` — public; no session needed to read. */
export async function getContent<T>(area: ContentArea): Promise<T> {
  return backendFetch<T>(`/api/content/${area}`, { auth: false });
}

/** `PUT /api/content/:area` — a subset of the area's known fields. */
export async function updateContent<T>(area: ContentArea, fields: Partial<T>): Promise<T> {
  try {
    return await backendFetch<T>(`/api/content/${area}`, {
      auth: true,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  } catch (err) {
    mapAuthed(err);
  }
}

/**
 * `POST /api/content/upload` — same two-stage upload-then-save pattern as
 * `uploadLogFile` above: upload first, then pass the returned URL into
 * `updateContent`. No image bytes ever go in a JSON body. Content-area photos
 * are images only (no PDF) — a separate endpoint with a stricter validator.
 */
export async function uploadContentImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  try {
    const res = await backendFetch<{ imageUrl: string }>("/api/content/upload", {
      auth: true,
      method: "POST",
      body: form,
    });
    return res.imageUrl;
  } catch (err) {
    mapAuthed(err);
  }
}

export type { IntroContent, HowIGotHereContent, LetsTalkContent };

// ---- Built: projects + stats (feature 14) ----

/** `GET /api/projects` — public; no session needed to read. */
export async function getProjects(): Promise<Project[]> {
  const res = await backendFetch<{ projects: Project[] }>("/api/projects", { auth: false });
  return res.projects;
}

export interface UpdateProjectFields {
  name?: string;
  lead?: boolean;
  stack?: string[];
  hook?: string;
  whatItDoes?: string;
  decision?: string | null;
  statsLabel?: string;
  failuresLabel?: string | null;
  failures?: string[] | null;
  apiTitle?: string | null;
  apiLines?: string[] | null;
  demoUrl?: string;
  demoLabel?: string;
  sourceUrl?: string;
  sortOrder?: number;
}

/** `PUT /api/projects/:id` — non-stat fields only. No `previousValue` here (C18 scopes that to stats). */
export async function updateProject(id: string, fields: UpdateProjectFields): Promise<Project> {
  try {
    const res = await backendFetch<{ project: Project }>(`/api/projects/${id}`, {
      auth: true,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return res.project;
  } catch (err) {
    mapAuthed(err);
  }
}

export interface StatInput {
  label: string;
  value: string;
  note?: string | null;
  accent?: boolean;
}

/** `POST /api/projects/:id/stats` — a brand-new row; never carries `previousValue`. */
export async function createStat(projectId: string, input: StatInput): Promise<ProjectStat> {
  try {
    const res = await backendFetch<{ stat: ProjectStat }>(`/api/projects/${projectId}/stats`, {
      auth: true,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.stat;
  } catch (err) {
    mapAuthed(err);
  }
}

/**
 * `PUT /api/projects/:id/stats/:statId` — constraint C18. `previousValue`
 * MUST be the value the confirm dialog displayed as "old" — never re-derived
 * here. Throws `StatConflictError` (not `BackendError`) on a 409 so the
 * caller can distinguish "stale confirmation" from any other failure.
 */
export async function updateStat(
  projectId: string,
  statId: string,
  input: StatInput & { previousValue: string },
): Promise<ProjectStat> {
  try {
    const res = await backendFetch<{ stat: ProjectStat }>(
      `/api/projects/${projectId}/stats/${statId}`,
      {
        auth: true,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return res.stat;
  } catch (err) {
    mapStatWrite(err);
  }
}

// ---- Toolbox: groups + items (feature 15) ----

/** `GET /api/toolbox` — public; no session needed to read. */
export async function getToolbox(): Promise<ToolboxGroup[]> {
  const res = await backendFetch<{ groups: ToolboxGroup[] }>("/api/toolbox", { auth: false });
  return res.groups;
}

export interface NewToolboxGroupInput {
  name: string;
  sortOrder?: number;
}

export async function createToolboxGroup(input: NewToolboxGroupInput): Promise<ToolboxGroup> {
  try {
    const res = await backendFetch<{ group: ToolboxGroup }>("/api/toolbox/groups", {
      auth: true,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.group;
  } catch (err) {
    mapAuthed(err);
  }
}

export interface UpdateToolboxGroupFields {
  name?: string;
  sortOrder?: number;
}

export async function updateToolboxGroup(
  id: string,
  fields: UpdateToolboxGroupFields,
): Promise<ToolboxGroup> {
  try {
    const res = await backendFetch<{ group: ToolboxGroup }>(`/api/toolbox/groups/${id}`, {
      auth: true,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return res.group;
  } catch (err) {
    mapAuthed(err);
  }
}

export interface NewToolboxItemInput {
  name: string;
  note?: string | null;
  sortOrder?: number;
}

export async function createToolboxItem(
  groupId: string,
  input: NewToolboxItemInput,
): Promise<ToolboxItem> {
  try {
    const res = await backendFetch<{ item: ToolboxItem }>(
      `/api/toolbox/groups/${groupId}/items`,
      {
        auth: true,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return res.item;
  } catch (err) {
    mapAuthed(err);
  }
}

export interface UpdateToolboxItemFields {
  name?: string;
  note?: string | null;
  sortOrder?: number;
  groupId?: string;
}

export async function updateToolboxItem(
  id: string,
  fields: UpdateToolboxItemFields,
): Promise<ToolboxItem> {
  try {
    const res = await backendFetch<{ item: ToolboxItem }>(`/api/toolbox/items/${id}`, {
      auth: true,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return res.item;
  } catch (err) {
    mapAuthed(err);
  }
}

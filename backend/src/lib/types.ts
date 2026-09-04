/**
 * Shared Log types. The `LogEntry` shape below is exactly the JSON returned by
 * `GET /api/log` (as `{ entries: LogEntry[] }`) and echoed by `POST /api/log`
 * (as `{ entry: LogEntry }`). The frontend depends on this contract.
 */
export interface LogEntry {
  id: string;
  title: string;
  description: string;
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
  imageUrl: string;
  tags: string[];
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface NewLogEntry {
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  tags: string[];
}

/**
 * Content-area shapes (feature 13). Each is exactly the JSON returned by
 * `GET /api/content/<area>` and accepted (as a partial) by
 * `PUT /api/content/<area>`. The frontend depends on this contract.
 */
export interface IntroContent {
  headline: string;
  subheadline: string;
  heroPhotoUrl: string;
}

export interface HowIGotHereContent {
  body: string;
  photoUrl: string;
}

export interface LetsTalkContent {
  email: string;
  githubUrl: string;
  linkedinUrl: string;
}

/**
 * Built page shapes (feature 14). `ProjectStat.value` is always an opaque
 * display string — never a parsed number (constraint C11). Exactly the JSON
 * returned by `GET /api/projects` (as `{ projects: Project[] }`) and echoed
 * by the write endpoints. The frontend depends on this contract.
 */
export interface ProjectStat {
  id: string;
  label: string;
  value: string;
  note: string | null;
  accent: boolean;
}

/**
 * Toolbox page shapes (feature 15). Exactly the JSON returned by
 * `GET /api/toolbox` (as `{ groups: ToolboxGroup[] }`) and echoed by the
 * write endpoints. Deliberately has NO confirm-before-save concept — that is
 * specific to `ProjectStat` (constraint C18); a toolbox item is a curated
 * list entry, not a factual/verifiable claim (constraint C11 does not apply
 * here).
 */
export interface ToolboxItem {
  id: string;
  name: string;
  note: string | null;
}

export interface ToolboxGroup {
  id: string;
  name: string;
  items: ToolboxItem[];
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  lead: boolean;
  stack: string[];
  hook: string;
  whatItDoes: string;
  decision: string | null;
  statsLabel: string;
  failuresLabel: string | null;
  failures: string[] | null;
  apiTitle: string | null;
  apiLines: string[] | null;
  demoUrl: string;
  demoLabel: string;
  sourceUrl: string;
  stats: ProjectStat[];
}

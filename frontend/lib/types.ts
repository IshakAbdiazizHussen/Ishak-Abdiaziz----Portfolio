/**
 * Shared frontend types.
 *
 * `LogEntry` mirrors the backend's `GET /api/log` response contract
 * (`backend/src/lib/types.ts`). Kept in sync by hand — if the backend shape
 * changes, change it here too.
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

/**
 * Content-area shapes (feature 13). Mirror `backend/src/lib/types.ts`
 * exactly — `GET /api/content/:area` returns one of these flat objects.
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
 * Built page shapes (feature 14). Mirror `backend/src/lib/types.ts`. `value`
 * on a stat is always an opaque display string — never parsed as a number.
 */
export interface ProjectStat {
  id: string;
  label: string;
  value: string;
  note: string | null;
  accent: boolean;
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

/** Toolbox shapes (feature 15). Mirror `backend/src/lib/types.ts`. */
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

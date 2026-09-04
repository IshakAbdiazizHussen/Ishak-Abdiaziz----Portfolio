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

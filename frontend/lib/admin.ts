import { backendFetch, BackendError } from "./backend";

/**
 * The single path to every admin endpoint. All calls use `auth: true`
 * (`credentials: "include"`) so the HttpOnly `sid` cookie rides along — the
 * frontend never reads that cookie and never stores a token.
 */

/** Thrown when an authed call comes back 401 (session missing/expired). */
export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "NotAuthenticatedError";
  }
}

function mapAuthed(err: unknown): never {
  if (err instanceof BackendError && err.status === 401) throw new NotAuthenticatedError();
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

export async function uploadImage(file: File): Promise<string> {
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

import { env } from "./env";

/**
 * The single entry point for talking to the backend. Every request to the API
 * goes through here — nothing else in the frontend calls `fetch` against
 * `NEXT_PUBLIC_BACKEND_URL` directly (constraint C3).
 *
 * No concrete calls are wired yet. Feature 8 (contact), feature 9 (Log read),
 * and feature 10 (admin) add the typed helpers that build on this.
 */

export interface BackendFetchOptions extends Omit<RequestInit, "credentials"> {
  /**
   * Send the admin session cookie?
   *  - `true`  for authed calls (admin login/session, Log write, image upload)
   *  - `false` for public calls (GET /api/log, POST /api/contact)
   */
  auth: boolean;
}

export class BackendError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export async function backendFetch<T = unknown>(
  path: string,
  { auth, headers, ...init }: BackendFetchOptions,
): Promise<T> {
  const url = `${env.backendUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    credentials: auth ? "include" : "omit",
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new BackendError(res.status, message);
  }

  return body as T;
}

import { backendFetch, BackendError } from "./backend";

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  /** Honeypot — real users leave this empty. */
  honeypot: string;
}

export type ContactResult =
  { ok: true } | { ok: false; kind: "validation" | "ratelimit" | "server"; message: string };

/**
 * POST the contact form to the backend. Public call — no credentials.
 * Never throws: maps every failure (HTTP error or network) to a typed result
 * so the form can render the right message.
 */
export async function sendContactMessage(payload: ContactPayload): Promise<ContactResult> {
  try {
    await backendFetch<{ ok: boolean }>("/api/contact", {
      auth: false,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim(),
        message: payload.message.trim(),
        honeypot: payload.honeypot,
      }),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof BackendError) {
      if (err.status === 400) {
        return { ok: false, kind: "validation", message: "Please check the form and try again." };
      }
      if (err.status === 429) {
        return {
          ok: false,
          kind: "ratelimit",
          message: "You've sent a few messages already — please wait a minute and try again.",
        };
      }
    }
    return {
      ok: false,
      kind: "server",
      message: "Something went wrong sending your message.",
    };
  }
}

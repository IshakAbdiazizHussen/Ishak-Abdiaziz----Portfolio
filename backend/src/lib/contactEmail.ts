/**
 * Pure formatting for the contact email. No config, no SDK — so it is
 * unit-testable in isolation. `email.ts` adds the from/to/replyTo and sends.
 *
 * All visitor-supplied text is HTML-escaped before it goes into the HTML part;
 * newlines in the subject are collapsed. Submitted values never set headers,
 * `to`, or `from`.
 */

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface FormattedEmail {
  subject: string;
  text: string;
  html: string;
}

export function formatContactEmail(msg: ContactMessage): FormattedEmail {
  const name = escapeHtml(msg.name);
  const email = escapeHtml(msg.email);
  const body = escapeHtml(msg.message).replace(/\r?\n/g, "<br>");

  return {
    subject: `Portfolio contact — ${msg.name}`.replace(/[\r\n]+/g, " ").slice(0, 200),
    text: `From: ${msg.name} <${msg.email}>\n\n${msg.message}`,
    html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p>\n<p>${body}</p>`,
  };
}

/**
 * Client-side contact validation — for UX only. The backend re-validates every
 * field (backend/src/routes/contact.ts); these rules mirror it so the user gets
 * fast feedback, not so anything here is trusted.
 */
export interface ContactValues {
  name: string;
  email: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIMITS = { name: 100, email: 200, message: 5000 } as const;

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = "Your name is required.";
  else if (name.length > LIMITS.name) errors.name = `Keep this under ${LIMITS.name} characters.`;

  if (!email) errors.email = "Your email is required.";
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email))
    errors.email = "Enter a valid email address.";

  if (!message) errors.message = "A message is required.";
  else if (message.length > LIMITS.message)
    errors.message = `Keep this under ${LIMITS.message} characters.`;

  return errors;
}

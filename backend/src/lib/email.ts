import { Resend } from "resend";
import { config } from "../config";
import { logger } from "./logger";
import { formatContactEmail, type ContactMessage } from "./contactEmail";

/**
 * Transactional email via Resend. Server-only. This is the only module that
 * talks to the email provider.
 */

let client: Resend | null = null;

function resend(): Resend {
  if (!client) client = new Resend(config.RESEND_API_KEY);
  return client;
}

export async function sendContactEmail(msg: ContactMessage): Promise<void> {
  const { subject, text, html } = formatContactEmail(msg);

  const { error } = await resend().emails.send({
    from: config.CONTACT_FROM_EMAIL,
    to: config.CONTACT_TO_EMAIL,
    replyTo: msg.email,
    subject,
    text,
    html,
  });

  if (error) {
    // Log the provider error server-side only; callers surface a generic 502.
    logger.error({ err: error }, "resend send failed");
    throw new Error("email provider error");
  }
}

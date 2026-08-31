import { Router } from "express";
import { z } from "zod";
import { limit } from "../lib/rateLimit";
import { sendContactEmail } from "../lib/email";
import { badRequest } from "../lib/errors";
import { logger } from "../lib/logger";

export const contactRouter = Router();

const CONTACT_MAX = 5;
const CONTACT_WINDOW_SEC = 600; // 10 min

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name is required")
    .max(100)
    .refine((v) => !/[\r\n]/.test(v), "name is invalid"),
  email: z.string().trim().max(200).email("a valid email is required"),
  message: z.string().trim().min(1, "message is required").max(5000),
  // Hidden field — real users leave it empty; bots fill it.
  honeypot: z.string().max(200).optional().default(""),
});

/**
 * POST /api/contact  (public, but CORS-gated)
 * Rate-limit (fail closed) -> validate -> honeypot -> send email.
 * Never touches Postgres, Redis (beyond the limiter counter), or blob storage.
 */
contactRouter.post("/", async (req, res, next) => {
  try {
    const ip = req.ip ?? "unknown";
    await limit("contact", ip, CONTACT_MAX, CONTACT_WINDOW_SEC); // throws 429 / 503

    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid submission");
    }

    if (parsed.data.honeypot.trim() !== "") {
      logger.warn({ ip }, "contact honeypot triggered — dropped");
      res.status(200).json({ ok: true });
      return;
    }

    try {
      await sendContactEmail({
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
      });
    } catch (err) {
      logger.error({ err }, "contact email delivery failed");
      res.status(502).json({ ok: false });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

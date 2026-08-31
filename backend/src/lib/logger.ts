import pino from "pino";
import { isTest } from "../config";

/**
 * Single shared logger. Known secret-bearing paths are redacted so nothing
 * sensitive reaches stdout even if an object is logged wholesale.
 */
export const logger = pino({
  level: isTest ? "silent" : (process.env.LOG_LEVEL ?? "info"),
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "res.headers['set-cookie']",
      "password",
      "*.password",
      "ADMIN_PASSWORD",
      "*.ADMIN_PASSWORD",
      "SESSION_SECRET",
      "*.SESSION_SECRET",
      "DATABASE_URL",
      "*.DATABASE_URL",
      "REDIS_URL",
      "*.REDIS_URL",
      "RESEND_API_KEY",
      "*.RESEND_API_KEY",
      "BLOB_READ_WRITE_TOKEN",
      "*.BLOB_READ_WRITE_TOKEN",
      "sid",
      "*.sid",
    ],
    censor: "[redacted]",
  },
});

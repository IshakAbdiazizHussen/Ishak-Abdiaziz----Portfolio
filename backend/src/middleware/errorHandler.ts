import type { ErrorRequestHandler, RequestHandler } from "express";
import { MulterError } from "multer";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

/**
 * Single central error handler. Handlers throw `AppError` (or call `next(err)`)
 * and never format their own 5xx bodies.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    logger.warn({ code: err.code, path: req.path }, "upload rejected");
    res.status(status).json({
      error: err.code === "LIMIT_FILE_SIZE" ? "Image exceeds the size limit" : "Invalid upload",
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, path: req.path }, "request error");
    } else {
      logger.warn({ msg: err.message, status: err.status, path: req.path }, "request rejected");
    }
    res.status(err.status).json({ error: err.expose ? err.message : "Service unavailable" });
    return;
  }

  logger.error({ err, path: req.path }, "unhandled error");
  res.status(500).json({ error: "Internal server error" });
};

import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/requireAdmin";
import { newLogEntrySchema } from "../lib/validation";
import { listEntries, createEntry } from "../lib/logRepo";
import { readCachedList, writeCachedList, invalidateList } from "../lib/logCache";
import { MAX_LOG_UPLOAD_BYTES, validateLogUpload } from "../lib/uploadValidation";
import { uploadImage } from "../lib/storage";
import { badRequest } from "../lib/errors";

export const logRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOG_UPLOAD_BYTES, files: 1 },
});

/**
 * GET /api/log  (public)
 * Response: { entries: LogEntry[] } — newest first.
 * Served from the Redis cache when warm; a cache miss/error falls through to
 * Postgres (fail open).
 */
logRouter.get("/", async (_req, res, next) => {
  try {
    const cached = await readCachedList();
    if (cached) {
      res.status(200).json({ entries: cached });
      return;
    }
    const entries = await listEntries();
    await writeCachedList(entries);
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/log  (admin)
 * Body: { title, description, date, imageUrl, tags } — validated server-side.
 * Inserts one row, invalidates the cache, echoes { entry: LogEntry }.
 */
logRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const parsed = newLogEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid entry");
    }
    const entry = await createEntry({
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      imageUrl: parsed.data.imageUrl,
      tags: parsed.data.tags,
    });
    await invalidateList();
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/log/upload  (admin, multipart, field "image")
 * Accepts a JPEG/PNG/WebP image or a PDF. Validates MIME + magic bytes + size
 * before storage; returns { imageUrl } (the field name is kept for the entry
 * body — the URL may point at an image or a PDF).
 */
logRouter.post("/upload", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw badRequest('No file provided (field "image")');

    const result = validateLogUpload({
      buffer: file.buffer,
      size: file.size,
      mimetype: file.mimetype,
    });
    if (!result.ok) throw badRequest(result.error);

    const { url } = await uploadImage(file.buffer, result.ext, result.contentType);
    res.status(200).json({ imageUrl: url });
  } catch (err) {
    next(err);
  }
});

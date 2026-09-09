import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/requireAdmin";
import { newLogEntrySchema, uuidParam } from "../lib/validation";
import { listEntries, createEntry, getEntry, updateEntry, deleteEntry } from "../lib/logRepo";
import { readCachedList, writeCachedList, invalidateList } from "../lib/logCache";
import { MAX_LOG_UPLOAD_BYTES, validateLogUpload } from "../lib/uploadValidation";
import { uploadImage, uploadLogPdf, deleteLogObjects } from "../lib/storage";
import { renderPdfFirstPage } from "../lib/pdfThumbnail";
import { badRequest, notFound } from "../lib/errors";
import { logger } from "../lib/logger";

function isUuid(value: string | undefined): value is string {
  return !!value && uuidParam.safeParse(value).success;
}

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
 * PUT /api/log/:id  (admin)
 * Full replacement of one entry's editable fields. `imageUrl` may be "" (no
 * attachment), the entry's existing URL (keep it), or a fresh one from
 * POST /api/log/upload. If it changed, the old file(s) are cleaned up.
 */
logRouter.put("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw notFound("Unknown entry");

    const parsed = newLogEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid entry");
    }

    const before = await getEntry(id);
    if (!before) throw notFound("Unknown entry");

    const entry = await updateEntry(id, {
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      imageUrl: parsed.data.imageUrl,
      tags: parsed.data.tags,
    });
    if (!entry) throw notFound("Unknown entry");
    await invalidateList();

    if (before.imageUrl && before.imageUrl !== entry.imageUrl) {
      void deleteLogObjects(before.imageUrl);
    }
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/log/:id  (admin)
 * Removes the entry and best-effort deletes its stored attachment.
 */
logRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw notFound("Unknown entry");

    const imageUrl = await deleteEntry(id);
    if (imageUrl === null) throw notFound("Unknown entry");
    await invalidateList();

    void deleteLogObjects(imageUrl);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/log/upload  (admin, multipart, field "image")
 * Accepts a JPEG/PNG/WebP image or a PDF. Validates MIME + magic bytes + size
 * before storage; returns { imageUrl } (the field name is kept for the entry
 * body — the URL may point at an image or a PDF).
 *
 * For a PDF, the first page is rendered to a PNG and stored alongside it
 * (`<id>.pdf` + `<id>.png`), so the public Log can show the page image; the
 * preview URL is just the PDF URL with `.pdf` → `.png`. If that render fails
 * (e.g. the renderer isn't available in the deployment bundle), the PDF is
 * still stored — just without a preview sibling — and the Log card falls back
 * to its "PDF ↗" tile. A preview problem must not block adding an entry.
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

    if (result.contentType === "application/pdf") {
      let preview: Buffer | null = null;
      try {
        preview = await renderPdfFirstPage(file.buffer);
      } catch (err) {
        logger.warn({ err }, "PDF preview render failed — storing the PDF without a preview");
      }
      const { url } = preview
        ? await uploadLogPdf(file.buffer, preview)
        : await uploadImage(file.buffer, "pdf", "application/pdf");
      res.status(200).json({ imageUrl: url });
      return;
    }

    const { url } = await uploadImage(file.buffer, result.ext, result.contentType);
    res.status(200).json({ imageUrl: url });
  } catch (err) {
    next(err);
  }
});

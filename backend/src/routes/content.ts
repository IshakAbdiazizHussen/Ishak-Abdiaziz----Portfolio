import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/requireAdmin";
import { CONTENT_AREAS, type ContentArea, getArea, updateArea } from "../lib/contentRepo";
import { CONTENT_AREA_SCHEMAS } from "../lib/validation";
import { readCachedArea, writeCachedArea, invalidateArea } from "../lib/contentCache";
import { MAX_IMAGE_BYTES, validateImage } from "../lib/uploadValidation";
import { uploadImage } from "../lib/storage";
import { badRequest, notFound } from "../lib/errors";

export const contentRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

function isContentArea(value: string): value is ContentArea {
  return (CONTENT_AREAS as readonly string[]).includes(value);
}

/**
 * GET /api/content/:area  (public)
 * area ∈ intro | how-i-got-here | lets-talk. Served from the Redis cache when
 * warm; a cache miss/error falls through to Postgres (fail open) — same
 * pattern as GET /api/log.
 */
contentRouter.get("/:area", async (req, res, next) => {
  try {
    const { area } = req.params;
    if (!area || !isContentArea(area)) {
      throw notFound("Unknown content area");
    }

    const cached = await readCachedArea(area);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const fields = await getArea(area);
    await writeCachedArea(area, fields);
    res.status(200).json(fields);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/content/:area  (admin)
 * Body: a subset of that area's known fields, validated against a fixed
 * per-area schema — an unknown key is rejected, never silently dropped.
 * Writes only the provided fields, invalidates that area's cache, and echoes
 * the area's full current field set.
 */
contentRouter.put("/:area", requireAdmin, async (req, res, next) => {
  try {
    const { area } = req.params;
    if (!area || !isContentArea(area)) {
      throw notFound("Unknown content area");
    }

    const schema = CONTENT_AREA_SCHEMAS[area];
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid content");
    }

    const updated = await updateArea(area, parsed.data as Record<string, string>);
    await invalidateArea(area);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/content/upload  (admin, multipart, field "image")
 * Identical validation + storage path to POST /api/log/upload — MIME
 * allowlist, magic-byte check, and hard size limit before anything reaches
 * blob storage. Namespaced under `content/` (vs. Log's `log/`) so the two
 * feature's uploads don't collide, but it is the exact same validator and the
 * exact same upload function, not a second implementation.
 */
contentRouter.post("/upload", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      throw badRequest('No image provided (field "image")');
    }

    const result = validateImage({
      buffer: file.buffer,
      size: file.size,
      mimetype: file.mimetype,
    });
    if (!result.ok) {
      throw badRequest(result.error);
    }

    const { url } = await uploadImage(file.buffer, result.ext, result.contentType, "content");
    res.status(200).json({ imageUrl: url });
  } catch (err) {
    next(err);
  }
});

/**
 * Pure, dependency-free upload validation. Checks the declared MIME type against
 * an allowlist AND verifies the file's magic bytes match — a `.txt` renamed to
 * `.png` is rejected. Runs BEFORE anything is uploaded to storage.
 *
 * `validateImage` (images only) backs the content-area photo uploads;
 * `validateLogUpload` (images + PDF, larger cap) backs the Log entry upload,
 * since Log attachments are frequently exported plots/reports saved as PDF.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_LOG_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — PDFs run larger

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const ALLOWED_LOG_UPLOAD_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"] as const;
export type AllowedLogUploadType = (typeof ALLOWED_LOG_UPLOAD_TYPES)[number];

export type ImageExt = "jpg" | "png" | "webp";
export type UploadExt = ImageExt | "pdf";

type SniffResult = { type: AllowedImageType; ext: ImageExt };
type UploadSniffResult = { type: AllowedLogUploadType; ext: UploadExt };

export type ValidateImageResult =
  { ok: true; ext: ImageExt; contentType: AllowedImageType } | { ok: false; error: string };

export type ValidateLogUploadResult =
  { ok: true; ext: UploadExt; contentType: AllowedLogUploadType } | { ok: false; error: string };

/** Identify a supported image by its leading bytes, or null. */
export function sniffImage(buf: Buffer): SniffResult | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { type: "image/png", ext: "png" };
  }
  if (
    buf.length >= 12 &&
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  ) {
    return { type: "image/webp", ext: "webp" };
  }
  return null;
}

/** Identify a PDF by its `%PDF-` header, or null. */
export function sniffPdf(buf: Buffer): { type: "application/pdf"; ext: "pdf" } | null {
  if (
    buf.length >= 5 &&
    buf[0] === 0x25 && // %
    buf[1] === 0x50 && // P
    buf[2] === 0x44 && // D
    buf[3] === 0x46 && // F
    buf[4] === 0x2d //   -
  ) {
    return { type: "application/pdf", ext: "pdf" };
  }
  return null;
}

export function validateImage(input: {
  buffer: Buffer;
  size: number;
  mimetype: string;
}): ValidateImageResult {
  if (input.size <= 0 || input.buffer.length === 0) {
    return { ok: false, error: "Empty file" };
  }
  if (input.size > MAX_IMAGE_BYTES || input.buffer.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image exceeds the 5 MB limit" };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(input.mimetype as AllowedImageType)) {
    return { ok: false, error: "Unsupported image type" };
  }
  const sniffed = sniffImage(input.buffer);
  if (!sniffed) {
    return { ok: false, error: "File is not a supported image" };
  }
  if (sniffed.type !== input.mimetype) {
    return { ok: false, error: "File content does not match its declared type" };
  }
  return { ok: true, ext: sniffed.ext, contentType: sniffed.type };
}

/**
 * Same discipline as `validateImage`, but the allowlist also includes
 * `application/pdf` and the size cap is `MAX_LOG_UPLOAD_BYTES`. Used only by
 * `POST /api/log/upload`.
 */
export function validateLogUpload(input: {
  buffer: Buffer;
  size: number;
  mimetype: string;
}): ValidateLogUploadResult {
  if (input.size <= 0 || input.buffer.length === 0) {
    return { ok: false, error: "Empty file" };
  }
  if (input.size > MAX_LOG_UPLOAD_BYTES || input.buffer.length > MAX_LOG_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds the 10 MB limit" };
  }
  if (!ALLOWED_LOG_UPLOAD_TYPES.includes(input.mimetype as AllowedLogUploadType)) {
    return { ok: false, error: "Unsupported file type — use a JPEG, PNG, WebP, or PDF" };
  }
  const sniffed: UploadSniffResult | null = sniffImage(input.buffer) ?? sniffPdf(input.buffer);
  if (!sniffed) {
    return { ok: false, error: "File is not a supported image or PDF" };
  }
  if (sniffed.type !== input.mimetype) {
    return { ok: false, error: "File content does not match its declared type" };
  }
  return { ok: true, ext: sniffed.ext, contentType: sniffed.type };
}

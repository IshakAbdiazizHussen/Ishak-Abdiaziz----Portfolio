/**
 * Pure, dependency-free image validation. Checks the declared MIME type against
 * an allowlist AND verifies the file's magic bytes match — a `.txt` renamed to
 * `.png` is rejected. Runs BEFORE anything is uploaded to storage.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export type ImageExt = "jpg" | "png" | "webp";

type SniffResult = { type: AllowedImageType; ext: ImageExt };

export type ValidateImageResult =
  { ok: true; ext: ImageExt; contentType: AllowedImageType } | { ok: false; error: string };

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

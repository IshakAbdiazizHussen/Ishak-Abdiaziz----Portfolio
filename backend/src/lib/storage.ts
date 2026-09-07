import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { config, publicBaseUrl, storageDriver } from "../config";
import { AppError } from "./errors";
import { logger } from "./logger";
import type { UploadExt } from "./uploadValidation";

/**
 * Local-driver upload root. `createApp` serves this directory read-only at
 * `/uploads` when `storageDriver === "local"`.
 */
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

/**
 * Write one object and return its public URL.
 *
 * Driver:
 *  - "blob"  → Vercel Blob (production; needs BLOB_READ_WRITE_TOKEN)
 *  - "local" → backend/uploads/<key>, URL `${publicBaseUrl}/uploads/<key>`
 *              (development fallback when no Blob token is configured)
 *
 * This is the ONLY module that writes upload bytes anywhere; they never touch
 * Postgres.
 */
async function writeObject(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ url: string }> {
  if (storageDriver === "local") {
    const dest = path.join(LOCAL_UPLOAD_DIR, key);
    try {
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, buffer);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      throw new AppError(503, `Could not write the upload to local storage (${detail}).`, true);
    }
    return { url: `${publicBaseUrl}/uploads/${key}` };
  }

  const token = config.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new AppError(503, "File storage is not configured (no BLOB_READ_WRITE_TOKEN).", true);
  }

  try {
    const blob = await put(key, buffer, {
      access: "public",
      contentType,
      token,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  } catch (err) {
    // A bad/placeholder token or an unreachable store surfaces here (e.g.
    // "Vercel Blob: This store does not exist."). Report it as a clear 503
    // rather than an opaque "Internal server error".
    const detail = err instanceof Error ? err.message : "unknown error";
    throw new AppError(
      503,
      `File storage is unavailable (${detail}). Check that BLOB_READ_WRITE_TOKEN points to a real Vercel Blob store.`,
      true,
    );
  }
}

/**
 * Uploads a file and returns its public URL. The object key is server-generated
 * (`<prefix>/<uuid>.<ext>`) — the client filename is never trusted. `prefix`
 * namespaces uploads by feature (Log uploads default to `log/`; content-area
 * images pass `content`). `ext` is `jpg`/`png`/`webp` for content images.
 */
export async function uploadImage(
  buffer: Buffer,
  ext: UploadExt,
  contentType: string,
  prefix: string = "log",
): Promise<{ url: string }> {
  return writeObject(`${prefix}/${randomUUID()}.${ext}`, buffer, contentType);
}

/**
 * Uploads a Log PDF together with its first-page PNG preview. Both share one id
 * so the preview URL is the PDF URL with `.pdf` → `.png` (the public Log derives
 * it that way — no extra field on the entry).
 */
export async function uploadLogPdf(
  pdfBytes: Buffer,
  previewPng: Buffer,
): Promise<{ url: string; previewUrl: string }> {
  const id = randomUUID();
  const [main, preview] = await Promise.all([
    writeObject(`log/${id}.pdf`, pdfBytes, "application/pdf"),
    writeObject(`log/${id}.png`, previewPng, "image/png"),
  ]);
  return { url: main.url, previewUrl: preview.url };
}

/**
 * Best-effort removal of a Log entry's stored attachment. For a PDF it also
 * removes the sibling `.png` preview. Never throws — a failed cleanup is
 * logged, not surfaced (the entry is already gone from the database).
 */
export async function deleteLogObjects(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  const urls = [imageUrl];
  if (/\.pdf(\?.*)?$/i.test(imageUrl)) {
    urls.push(imageUrl.replace(/\.pdf(\?.*)?$/i, ".png"));
  }

  for (const url of urls) {
    try {
      if (storageDriver === "local") {
        const key = localKeyFromUrl(url);
        if (key) await rm(path.join(LOCAL_UPLOAD_DIR, key), { force: true });
      } else {
        await del(url, { token: config.BLOB_READ_WRITE_TOKEN });
      }
    } catch (err) {
      logger.warn({ err, url }, "log attachment cleanup failed (ignored)");
    }
  }
}

/** `${publicBaseUrl}/uploads/log/<id>.pdf` → `log/<id>.pdf`, or null if it isn't ours. */
function localKeyFromUrl(url: string): string | null {
  const prefix = `${publicBaseUrl}/uploads/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  if (!key || key.startsWith("/") || key.split("/").includes("..")) return null;
  return key;
}

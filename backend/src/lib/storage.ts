import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { config, publicBaseUrl, storageDriver } from "../config";
import { AppError } from "./errors";
import type { UploadExt } from "./uploadValidation";

/**
 * Local-driver upload root. `createApp` serves this directory read-only at
 * `/uploads` when `storageDriver === "local"`.
 */
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

/**
 * Uploads a file and returns its public URL. The object key is server-generated
 * (`<prefix>/<uuid>.<ext>`) — the client filename is never trusted. This is the
 * ONLY module that writes upload bytes anywhere; they never touch Postgres.
 * `prefix` namespaces uploads by feature (Log uploads default to `log/`;
 * content-area images pass `content`). `ext` is `jpg`/`png`/`webp` for content
 * images, plus `pdf` for Log attachments.
 *
 * Driver:
 *  - "blob"  → Vercel Blob (production; needs BLOB_READ_WRITE_TOKEN)
 *  - "local" → backend/uploads/<key>, URL `${publicBaseUrl}/uploads/<key>`
 *              (development fallback when no Blob token is configured)
 */
export async function uploadImage(
  buffer: Buffer,
  ext: UploadExt,
  contentType: string,
  prefix: string = "log",
): Promise<{ url: string }> {
  const key = `${prefix}/${randomUUID()}.${ext}`;

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

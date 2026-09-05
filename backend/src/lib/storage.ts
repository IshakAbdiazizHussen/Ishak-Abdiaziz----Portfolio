import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { config } from "../config";
import { AppError } from "./errors";
import type { UploadExt } from "./uploadValidation";

/**
 * Uploads a file to blob storage and returns its public URL. The object key
 * is server-generated (`<prefix>/<uuid>.<ext>`) — the client filename is never
 * trusted. This is the ONLY module that writes upload bytes anywhere; they
 * never touch Postgres. `prefix` namespaces uploads by feature (Log uploads
 * default to `log/`; content-area images pass `content`) — reused as-is by
 * every upload endpoint rather than forked per feature. `ext` is `jpg`/`png`/
 * `webp` for content images, plus `pdf` for Log attachments.
 */
export async function uploadImage(
  buffer: Buffer,
  ext: UploadExt,
  contentType: string,
  prefix: string = "log",
): Promise<{ url: string }> {
  const key = `${prefix}/${randomUUID()}.${ext}`;
  try {
    const blob = await put(key, buffer, {
      access: "public",
      contentType,
      token: config.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  } catch (err) {
    // A bad/placeholder BLOB_READ_WRITE_TOKEN or an unreachable store surfaces
    // here (e.g. "Vercel Blob: This store does not exist."). Report it as a
    // clear 503 to the admin rather than an opaque "Internal server error".
    const detail = err instanceof Error ? err.message : "unknown error";
    throw new AppError(
      503,
      `File storage is unavailable (${detail}). Check that BLOB_READ_WRITE_TOKEN points to a real Vercel Blob store.`,
      true,
    );
  }
}

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { config } from "../config";
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
  const blob = await put(key, buffer, {
    access: "public",
    contentType,
    token: config.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

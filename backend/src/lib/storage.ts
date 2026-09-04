import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { config } from "../config";
import type { ImageExt } from "./uploadValidation";

/**
 * Uploads an image to blob storage and returns its public URL. The object key
 * is server-generated (`<prefix>/<uuid>.<ext>`) — the client filename is never
 * trusted. This is the ONLY module that writes image bytes anywhere; they
 * never touch Postgres. `prefix` namespaces uploads by feature (Log images
 * default to `log/`; content-area images pass `content`) — reused as-is by
 * every upload endpoint rather than forked per feature.
 */
export async function uploadImage(
  buffer: Buffer,
  ext: ImageExt,
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

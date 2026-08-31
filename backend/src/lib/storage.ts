import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { config } from "../config";
import type { ImageExt } from "./uploadValidation";

/**
 * Uploads an image to blob storage and returns its public URL. The object key
 * is server-generated (`log/<uuid>.<ext>`) — the client filename is never
 * trusted. This is the ONLY module that writes image bytes anywhere; they never
 * touch Postgres.
 */
export async function uploadImage(
  buffer: Buffer,
  ext: ImageExt,
  contentType: string,
): Promise<{ url: string }> {
  const key = `log/${randomUUID()}.${ext}`;
  const blob = await put(key, buffer, {
    access: "public",
    contentType,
    token: config.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

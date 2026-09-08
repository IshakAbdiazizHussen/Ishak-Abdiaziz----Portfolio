/**
 * A stored Log attachment is either a Vercel Blob object (production) or a
 * local-storage-driver file the backend serves at `/uploads/log/...`
 * (development, no Blob token). The backend validates `image_url` on write, so
 * a URL that reaches here matching one of those two shapes is trusted.
 */

/** Vercel Blob host — eligible for `next/image` (allow-listed in next.config.ts). */
export function isBlobHosted(imageUrl: string): boolean {
  try {
    return /\.blob\.vercel-storage\.com$/.test(new URL(imageUrl).hostname);
  } catch {
    return false;
  }
}

/** The local storage driver: any http(s) URL whose path is `/uploads/log|content/...`. */
export function isLocalUpload(imageUrl: string): boolean {
  try {
    const u = new URL(imageUrl);
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      /^\/uploads\/(log|content)\//.test(u.pathname)
    );
  } catch {
    return false;
  }
}

/** True if this URL was produced by the Log upload endpoint (Blob or local driver). */
export function isStoredAttachment(imageUrl: string): boolean {
  return isBlobHosted(imageUrl) || isLocalUpload(imageUrl);
}

export function isPdfAttachment(imageUrl: string): boolean {
  return /\.pdf(\?.*)?$/i.test(imageUrl);
}

/**
 * A displayable preview URL for an entry's attachment, or `null` if there is
 * none. PDFs resolve to the first-page PNG the backend renders at upload
 * (`<id>.pdf` → `<id>.png`).
 */
export function thumbFor(imageUrl: string): string | null {
  if (!isStoredAttachment(imageUrl)) return null;
  return isPdfAttachment(imageUrl) ? imageUrl.replace(/\.pdf(\?.*)?$/i, ".png") : imageUrl;
}

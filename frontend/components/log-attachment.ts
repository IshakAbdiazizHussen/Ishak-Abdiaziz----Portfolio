const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/+$/, "");

/** True if this URL was produced by the Log upload endpoint (Blob or local driver). */
export function isStoredAttachment(imageUrl: string): boolean {
  if (!imageUrl) return false;
  let host: string;
  try {
    host = new URL(imageUrl).hostname;
  } catch {
    return false;
  }
  return (
    /\.blob\.vercel-storage\.com$/.test(host) ||
    (BACKEND_ORIGIN !== "" && imageUrl.startsWith(`${BACKEND_ORIGIN}/uploads/`))
  );
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

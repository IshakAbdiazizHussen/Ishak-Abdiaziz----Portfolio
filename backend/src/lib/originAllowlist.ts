/**
 * Pure origin check for CORS. Given an exact allowlist and an optional preview
 * regex, returns a predicate. No config import — unit-testable in isolation.
 *
 * `previewRegex` (from `CORS_PREVIEW_ORIGIN_REGEX`) is the sanctioned escape
 * hatch for Vercel preview deployments: a matching Origin is allowed through
 * CORS so the PUBLIC endpoints work on a preview URL. It does NOT enable the
 * admin cookie flow there (the `sid` cookie is still cross-site). Keep the
 * pattern as tight as possible, or leave it unset.
 */
export function makeOriginCheck(
  allowed: readonly string[],
  previewRegex?: string,
): (origin: string) => boolean {
  const exact = new Set(allowed);
  const preview = previewRegex ? new RegExp(previewRegex) : null;

  return (origin: string): boolean => {
    if (exact.has(origin)) return true;
    if (preview && preview.test(origin)) return true;
    return false;
  };
}

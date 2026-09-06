"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./LogEntryCard.module.css";

/**
 * A Log PDF attachment: shows the first-page PNG the backend rendered at upload
 * (`<id>.pdf` → `<id>.png`), linking to the full PDF. If the preview image is
 * missing (an entry added before previews existed, or a render that failed),
 * it falls back to the hatch tile behind it — hence the `onError` state.
 */
export function PdfPreview({
  pdfUrl,
  previewUrl,
  blobHosted,
}: {
  pdfUrl: string;
  previewUrl: string;
  blobHosted: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.pdf}
      aria-label="Open PDF in a new tab"
    >
      {!failed &&
        (blobHosted ? (
          <Image
            src={previewUrl}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 15rem"
            className={styles.image}
            onError={() => setFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local-dev upload host, not an allow-listed next/image host
          <img
            src={previewUrl}
            alt=""
            className={styles.imageEl}
            onError={() => setFailed(true)}
          />
        ))}
      <span className={styles.pdfBadge}>PDF ↗</span>
    </a>
  );
}

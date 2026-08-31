import styles from "./PortraitPlaceholder.module.css";

/**
 * Placeholder portrait — an inline SVG, so there's no image request, no CLS
 * (intrinsic aspect ratio), and no CSP/optimizer fuss. When a real photo
 * exists, drop it in `public/` and swap this for
 * `<Image src={portrait} alt="…" priority width={…} height={…} />`.
 */
export function PortraitPlaceholder() {
  return (
    <svg
      className={styles.portrait}
      viewBox="0 0 320 400"
      role="img"
      aria-label="Portrait — placeholder"
    >
      <rect width="320" height="400" className={styles.bg} />
      <rect x="0.5" y="0.5" width="319" height="399" className={styles.frame} />
      <circle cx="160" cy="150" r="52" className={styles.stroke} />
      <path d="M64 346c0-58 43-104 96-104s96 46 96 104" className={styles.stroke} />
      <text x="160" y="386" textAnchor="middle" className={styles.caption}>
        replace with a photo
      </text>
    </svg>
  );
}

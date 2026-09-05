/**
 * Intro (landing) page content. The headline is fixed — do not paraphrase.
 *
 * Feature 18: `subheadline` and (indirectly, via an empty-string default) the
 * hero photo are now backend-fetched — see `lib/content.ts#fetchIntro`. This
 * module still supplies: (a) the fallback values `app/page.tsx` uses if the
 * backend/DB is unreachable, and (b) everything NOT in the Intro
 * content-area schema (kicker, the exact 3-line headline break, CTAs, the
 * marquee list, the Built hand-off, hero stats) — none of that is
 * owner-editable via the admin panel, by design (constraint C17).
 */
export const intro = {
  kicker: "Software and AI Engineer",
  headline: "I build AI systems, then try to break them before anyone else does.",
  /** The hero renders the headline on these exact three lines. */
  headlineLines: ["I build AI systems, then try", "to break them before anyone", "else does."],
  subheadline:
    "A software and AI engineer who ships the whole thing — model, API, and the " +
    "interface people actually use — and publishes the numbers, including the ones " +
    "that are not flattering.",
  primaryCta: { href: "/built", label: "See what I built" },
  secondaryCta: { href: "/lets-talk", label: "Get in touch" },
  stackLabel: "Day-to-day stack",
  /** Ordered tech-stack marquee. Keep it to things you actually use day to day. */
  marquee: [
    "Next.js",
    "TypeScript",
    "FastAPI",
    "Django",
    "PyTorch",
    "ONNX Runtime",
    "PostgreSQL",
    "Redis",
    "Docker",
    "Tailwind CSS",
    "HTMX",
    "pytest",
  ],
  next: {
    kicker: "Next",
    title: "Two projects, with the numbers attached",
    sub: "Ai-image-classifier and Research-Agent — what they do, and one hard call in each.",
    href: "/built",
  },
} as const;

export interface HeroStat {
  label: string;
  value: string;
  /** Trailing qualifier, rendered dimmer than the value. */
  note?: string;
  /** Render the value in the accent colour. */
  accent?: boolean;
}

export const heroStats: HeroStat[] = [
  { label: "Shipped", value: "2", note: "live products" },
  { label: "Classifier accuracy", value: "78.2%", note: "held-out", accent: true },
  { label: "Stack", value: "End to end" },
];

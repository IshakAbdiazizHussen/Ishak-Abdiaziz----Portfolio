/** Intro (landing) page content. The headline is fixed — do not paraphrase. */
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
  /** Ordered tech-stack marquee. Keep it to things that appear in real projects. */
  marquee: [
    "TypeScript",
    "Next.js",
    "React",
    "Node.js",
    "Express",
    "Python",
    "FastAPI",
    "PyTorch",
    "ONNX",
    "LangGraph",
    "PostgreSQL",
    "Redis",
    "Docker",
    "Vercel",
    "Railway",
  ],
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

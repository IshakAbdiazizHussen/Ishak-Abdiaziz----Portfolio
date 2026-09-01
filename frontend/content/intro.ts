/** Intro (landing) page content. The headline is fixed — do not paraphrase. */
export const intro = {
  kicker: "Software and AI Engineer",
  headline: "I build AI systems, then try to break them before anyone else does.",
  /** The hero forces a line break here: the head ends on "before",
      the tail ("anyone else does.") starts the final line. */
  headlineHead: "I build AI systems, then try to break them before",
  headlineTail: "anyone else does.",
  subheadline:
    "A software and AI engineer who ships the whole thing — model, API, and the " +
    "interface people actually use — and publishes the numbers, including the ones " +
    "that are not flattering.",
  primaryCta: { href: "/built", label: "See what I've built" },
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

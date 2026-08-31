/** Intro (landing) page content. The headline is fixed — do not paraphrase. */
export const intro = {
  headline: "I build AI systems, then try to break them before anyone else does.",
  subheadline:
    "Software and AI Engineer. I ship full, working products and have real ML depth — " +
    "trained models, serving infrastructure, failure-mode design, and measured results.",
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

export interface ProjectStat {
  label: string;
  value: string;
  accent?: boolean;
}

export interface Project {
  slug: string;
  name: string;
  /** Shows the amber "Lead project" badge in the card header. */
  lead?: boolean;
  /** Rendered dot-separated, top-right of the card header. */
  stack: string[];
  hook: string;
  whatItDoes: string;
  /** Body of the "One hard decision" block. Omit to hide the block entirely. */
  decision?: string;
  statsLabel: string;
  stats: ProjectStat[];
  /** Omit both to hide the failure-modes panel entirely. */
  failuresLabel?: string;
  failures?: string[];
  /** Omit to hide the code-sample panel entirely. */
  api?: { title: string; lines: string[] };
  /** TODO: replace with the real deployed URLs before launch. */
  demoUrl: string;
  demoLabel: string;
  sourceUrl: string;
}

export const projects: Project[] = [
  {
    slug: "ai-image-classifier",
    name: "Ai-image-classifier",
    lead: true,
    stack: ["PyTorch", "FastAPI", "Next.js", "Docker"],
    hook:
      "Upload an image, get a predicted class, a confidence score, and the full " +
      "probability distribution — never just a label.",
    whatItDoes:
      "A convolutional classifier over ten categories, trained in PyTorch and served " +
      "behind a FastAPI endpoint that the Next.js client calls directly. The response " +
      "carries the argmax class, its softmax confidence and all ten probabilities, so " +
      "the interface can show a close call as a close call rather than rounding it into " +
      "certainty.",
    statsLabel: "Verified · held-out test set",
    stats: [
      { label: "Accuracy", value: "78.2%", accent: true },
      { label: "Macro F1", value: "0.78" },
      { label: "Classes", value: "10" },
    ],
    demoUrl: "https://ai-image-classifer.vercel.app",
    demoLabel: "Try it live",
    sourceUrl: "https://github.com/IshakAbdiazizHussen/Ai-image-classifer-",
  },
  {
    slug: "research-agent",
    name: "Research-Agent",
    lead: true,
    stack: ["LangGraph", "Python", "Web search"],
    hook:
      "Ask a question, get an answer with numbered, clickable citations — and a run " +
      "that resumes instead of restarting when something upstream fails.",
    whatItDoes:
      "A LangGraph agent modelled as a cyclic graph: it searches the live web, grades " +
      "the relevance and quality of what it finds, and if the evidence is thin it " +
      "rewrites the query and searches again before answering. Every claim in the " +
      "answer is tied to a numbered source. Graph state is checkpointed after each " +
      "node, so an interrupted run picks up from the last completed step.",
    statsLabel: "How it behaves",
    stats: [
      { label: "Control flow", value: "Cyclic", accent: true },
      { label: "Citations", value: "Linked" },
      { label: "Resumable", value: "Yes" },
    ],
    failuresLabel: "Failure modes I tested for",
    failures: [
      "A thinly-documented topic loops to the retry cap and answers from weak sources rather than admitting the gap.",
      "Citations point at the retrieved page, not the exact passage; a moved or edited page breaks the link.",
      "Very recent events lag the search index, so “latest” can be a few hours stale.",
      "The grader is itself an LLM call — it can pass a confidently-wrong source that reads well.",
    ],
    api: {
      title: 'run("…")',
      lines: ['→ { "answer": "…",', '    "citations": [1, 2, 3],', '    "steps": 5, "resumed": false }'],
    },
    demoUrl: "https://research-agent-weld.vercel.app",
    demoLabel: "Try it live",
    sourceUrl: "https://github.com/IshakAbdiazizHussen/Research-Agent-",
  },
];

export const builtNext = {
  kicker: "Next",
  title: "What I shipped and learned, in order",
  href: "/log",
};

export const builtHeader = {
  kicker: "Built",
  title: "Two projects I can defend line by line",
  sub:
    "Both are deployed and open. Every number below comes from a held-out evaluation " +
    "I can reproduce on request; where I have not measured something, I say so instead " +
    "of estimating.",
};

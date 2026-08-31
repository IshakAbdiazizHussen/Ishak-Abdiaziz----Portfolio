export interface ProjectStat {
  label: string;
  value: string;
  note?: string;
}

export interface Project {
  slug: string;
  name: string;
  role: "flagship" | "supporting";
  hook: string;
  whatItDoes: string;
  decisionStory: { title: string; body: string };
  stats: ProjectStat[];
  stack: string[];
  /** TODO: replace with the real deployed URLs before launch. */
  demoUrl: string;
  sourceUrl: string;
}

export const projects: Project[] = [
  {
    slug: "ai-image-classifier",
    name: "Ai-image-classifier",
    role: "flagship",
    hook:
      "A PyTorch image classifier with production guardrails — it won't serve a model " +
      "that hasn't earned it, and it fails safe when its dependencies don't.",
    whatItDoes:
      "Trains a convolutional classifier in PyTorch, exports it to ONNX for portable " +
      "serving, and puts it behind a FastAPI service with Redis-backed rate limiting and " +
      "prediction caching. A promotion gate in the pipeline blocks any checkpoint that " +
      "doesn't clear an accuracy threshold from ever reaching production, and the reported " +
      "numbers include the categories the model is bad at, not just the ones it's good at.",
    decisionStory: {
      title: "Choosing which failure is acceptable",
      body:
        "The service leans on Redis for two things: rate limiting and prediction caching. " +
        "The easy move is to handle a Redis outage the same way in both places — but they " +
        "aren't the same risk. If rate limiting silently fails open, a single client can " +
        "bury the model under load and take it down for everyone. If caching fails open, " +
        "the worst case is a slower response. So the rate limiter fails CLOSED — no Redis, " +
        "no request, return 503 — while the cache fails OPEN, running the real prediction " +
        "whenever the cache is unreachable. Same dependency, opposite policy, on purpose.",
    },
    stats: [
      { label: "Overall accuracy", value: "78.2%" },
      { label: "Macro F1", value: "0.78" },
      { label: "Weakest class", value: "~60%", note: "deer — reported, not hidden" },
      { label: "Serving path", value: "ONNX → FastAPI" },
    ],
    stack: ["PyTorch", "ONNX", "FastAPI", "Redis", "Docker"],
    demoUrl: "https://example.com/ai-image-classifier",
    sourceUrl: "https://github.com/your-handle/ai-image-classifier",
  },
  {
    slug: "research-agent",
    name: "Research-Agent",
    role: "supporting",
    hook:
      "A web research agent that doesn't trust its first answer — it grades what it finds " +
      "and loops back to search again when the evidence is thin.",
    whatItDoes:
      "Built on LangGraph as a cyclic, stateful graph: it searches the live web, scores " +
      "the quality and relevance of the results, and if they're weak it refines the query " +
      "and searches again before answering. The final answer carries real numbered, " +
      "clickable citations. Checkpointing lets an interrupted run resume mid-loop instead " +
      "of starting over.",
    decisionStory: {
      title: "Making the loop resumable",
      body:
        "A linear prompt chain is easy to reason about but brittle: one flaky API call and " +
        "the whole run is gone. Modeling the agent as a graph with an explicit " +
        "grade-and-retry cycle fixed the quality problem — but a long multi-search run " +
        "could still die halfway and lose everything. Adding checkpointing to the graph " +
        "state persists every node transition, so a crashed or interrupted run picks up " +
        "from the last completed step and keeps the partial research instead of paying " +
        "for it twice.",
    },
    stats: [
      { label: "Control flow", value: "Cyclic graph", note: "search → grade → refine → retry" },
      { label: "Citations", value: "Numbered + linked" },
      { label: "Resumability", value: "Checkpointed state" },
    ],
    stack: ["LangGraph", "Python", "Live web search"],
    demoUrl: "https://example.com/research-agent",
    sourceUrl: "https://github.com/your-handle/research-agent",
  },
];

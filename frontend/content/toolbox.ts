export interface Tool {
  name: string;
  note?: string;
}

export interface ToolGroup {
  group: string;
  items: Tool[];
}

/**
 * Honest, grouped list. Rule: if it's here, you can be quizzed on it in an
 * interview. Trim or adjust to match what's actually true for you.
 */
export const toolboxHeader = {
  kicker: "Toolbox",
  title: "What I actually use",
  sub:
    "Things I have shipped something with. Tools I have only read about are not on this " +
    "list, and the list is short on purpose.",
};

export const toolboxNote =
  "Not on here, and I would need ramp-up time: Kubernetes, distributed training, Rust. " +
  "I would rather say that than pad the list.";

export const toolbox: ToolGroup[] = [
  {
    group: "Frontend",
    items: [
      { name: "Next.js", note: "App router, server components, both live projects" },
      { name: "TypeScript", note: "Default for anything with more than one screen" },
      { name: "Tailwind CSS", note: "Styling without a separate design system to maintain" },
      { name: "HTMX", note: "When a server-rendered app does not need a SPA" },
    ],
  },
  {
    group: "Backend",
    items: [
      { name: "FastAPI", note: "Inference endpoints, typed schemas, OpenAPI for free" },
      { name: "Django", note: "Modular monolith work where the admin and ORM earn their keep" },
      { name: "PostgreSQL", note: "Primary store; run traces, records, migrations" },
      { name: "Redis", note: "Caching fetched sources, queues, rate limits" },
    ],
  },
  {
    group: "AI / ML",
    items: [
      { name: "PyTorch", note: "Model definition, training loops, checkpointing" },
      { name: "ONNX Runtime", note: "Exported inference where CPU latency matters" },
      { name: "scikit-learn", note: "Baselines, metrics, confusion matrices" },
      { name: "LLM tool-calling", note: "Structured outputs, retrieval, verification passes" },
    ],
  },
  {
    group: "Infra",
    items: [
      { name: "Docker", note: "One image per service, same build locally and deployed" },
      { name: "GitHub Actions", note: "Tests and image builds on push" },
      { name: "pytest", note: "API contract tests and evaluation harnesses" },
      { name: "Linux / nginx", note: "Deploys, reverse proxy, log reading" },
    ],
  },
];

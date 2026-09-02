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

export const toolbox: ToolGroup[] = [
  {
    group: "Frontend",
    items: [
      { name: "TypeScript" },
      { name: "React" },
      { name: "Next.js", note: "App Router" },
      { name: "CSS Modules" },
    ],
  },
  {
    group: "Backend",
    items: [
      { name: "Node.js" },
      { name: "Express" },
      { name: "Python" },
      { name: "FastAPI" },
      { name: "PostgreSQL" },
      { name: "Redis", note: "sessions, short-TTL caching" },
    ],
  },
  {
    group: "AI · ML",
    items: [
      { name: "PyTorch" },
      { name: "ONNX", note: "portable model serving" },
      { name: "LangGraph", note: "stateful, cyclic agents" },
    ],
  },
  {
    group: "Infra",
    items: [
      { name: "Docker" },
      { name: "Vercel" },
      { name: "Railway" },
      { name: "Neon / Supabase", note: "managed Postgres" },
      { name: "Vercel Blob" },
      { name: "Resend", note: "transactional email" },
    ],
  },
];

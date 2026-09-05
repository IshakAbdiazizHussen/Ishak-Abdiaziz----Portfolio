import { backendFetch } from "./backend";
import type {
  IntroContent,
  HowIGotHereContent,
  Project as BackendProject,
  ToolboxGroup as BackendToolboxGroup,
} from "./types";
import type { Project, ProjectStat } from "@/content/projects";
import type { ToolGroup, Tool } from "@/content/toolbox";

/**
 * Backend-fetched content for the four pages that used to be pure hardcoded
 * static content — Intro, Built, How I Got Here, Toolbox (feature 18; see
 * docs/architecture.md §4 and constraint C6, superseded).
 *
 * Every fetch here is public (`auth: false`) and ISR-cached
 * (`next: { revalidate }`) — NOT `cache: 'no-store'` like the Log feed
 * (feature 9, lib/log.ts). These four pages are meant to stay near-instant;
 * the Log genuinely needs to be dynamic (it's an unbounded, frequently
 * updated feed) in a way these four aren't.
 *
 * The 30s window is how an admin edit (feature 17) reaches the public page
 * "without a frontend redeploy" (development-plan.md feature 18,
 * Implementation item 7). The other option that item names — on-demand
 * revalidation — would need a Next.js Route Handler to receive a webhook
 * from the backend, and this architecture has NONE (constraint C1/C3: no
 * Next.js API routes anywhere). So a short ISR window isn't a preference
 * between two equally-valid options; it's the only one the constraints
 * leave open.
 *
 * Every function reshapes the raw backend response into the exact shape the
 * existing feature 6/7 components already expect — those shapes are still
 * defined in content/*.ts, unchanged, per the Guidelines ("keep the
 * hardcoded content/*.ts files' TypeScript types as the canonical shape
 * reference... don't redefine the shapes from scratch"). Nothing here
 * changes any component's markup or prop types.
 */
const REVALIDATE_SECONDS = 30;

/** `GET /api/content/intro` — headline, subheadline, hero photo URL, as-is. */
export async function fetchIntro(): Promise<IntroContent> {
  const data = await backendFetch<IntroContent>("/api/content/intro", {
    auth: false,
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!data || typeof data.headline !== "string") {
    throw new Error("Unexpected /api/content/intro response shape");
  }
  return data;
}

export interface HowIGotHereText {
  /** `body` split on blank lines — one entry per <p>, exactly like the old hardcoded array. */
  paragraphs: string[];
  photoUrl: string;
}

/** `GET /api/content/how-i-got-here` — body reshaped into paragraphs, plus the photo URL. */
export async function fetchHowIGotHere(): Promise<HowIGotHereText> {
  const data = await backendFetch<HowIGotHereContent>("/api/content/how-i-got-here", {
    auth: false,
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!data || typeof data.body !== "string") {
    throw new Error("Unexpected /api/content/how-i-got-here response shape");
  }
  const paragraphs = data.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { paragraphs, photoUrl: data.photoUrl };
}

/**
 * `GET /api/projects` — reshaped from the backend's flat `apiTitle`/`apiLines`
 * and `null`-for-unset fields into `ProjectCard`'s existing `api: {title,
 * lines} | undefined` prop shape. `value` on a stat stays an opaque display
 * string throughout (constraint C11) — never parsed or reformatted here.
 */
export async function fetchProjects(): Promise<Project[]> {
  const data = await backendFetch<{ projects: BackendProject[] }>("/api/projects", {
    auth: false,
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!data || !Array.isArray(data.projects)) {
    throw new Error("Unexpected /api/projects response shape");
  }
  return data.projects.map(
    (p): Project => ({
      slug: p.slug,
      name: p.name,
      lead: p.lead,
      stack: p.stack,
      hook: p.hook,
      whatItDoes: p.whatItDoes,
      decision: p.decision ?? undefined,
      statsLabel: p.statsLabel,
      stats: p.stats.map(
        (s): ProjectStat => ({ label: s.label, value: s.value, accent: s.accent }),
      ),
      failuresLabel: p.failuresLabel ?? undefined,
      failures: p.failures ?? undefined,
      api: p.apiTitle && p.apiLines ? { title: p.apiTitle, lines: p.apiLines } : undefined,
      demoUrl: p.demoUrl,
      demoLabel: p.demoLabel,
      sourceUrl: p.sourceUrl,
    }),
  );
}

/** `GET /api/toolbox` — reshaped from the backend's `name` to the page's existing `group` field. */
export async function fetchToolbox(): Promise<ToolGroup[]> {
  const data = await backendFetch<{ groups: BackendToolboxGroup[] }>("/api/toolbox", {
    auth: false,
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!data || !Array.isArray(data.groups)) {
    throw new Error("Unexpected /api/toolbox response shape");
  }
  return data.groups.map(
    (g): ToolGroup => ({
      group: g.name,
      items: g.items.map((i): Tool => ({ name: i.name, note: i.note ?? undefined })),
    }),
  );
}

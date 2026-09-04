import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  listProjects,
  updateProject,
  createProject,
  createStat,
  updateStatIfMatches,
} from "../lib/projectsRepo";
import {
  updateProjectSchema,
  newProjectSchema,
  newProjectStatSchema,
  updateProjectStatSchema,
  uuidParam,
} from "../lib/validation";
import { readCachedProjects, writeCachedProjects, invalidateProjects } from "../lib/projectsCache";
import { badRequest, notFound } from "../lib/errors";

export const projectsRouter = Router();

function isUuid(value: string | undefined): value is string {
  return !!value && uuidParam.safeParse(value).success;
}

/**
 * GET /api/projects  (public)
 * Both projects with their stats, ordered by sort_order. Served from the
 * Redis cache when warm; a miss/error falls through to Postgres (fail open)
 * — same pattern as GET /api/log and GET /api/content/:area.
 */
projectsRouter.get("/", async (_req, res, next) => {
  try {
    const cached = await readCachedProjects();
    if (cached) {
      res.status(200).json({ projects: cached });
      return;
    }
    const projects = await listProjects();
    await writeCachedProjects(projects);
    res.status(200).json({ projects });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects  (admin)
 * Creates a project row. The NUMBER of projects on the site is a product
 * constraint enforced by policy (docs/constraints.md C8), not by this
 * endpoint.
 */
projectsRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const parsed = newProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid project");
    }
    const project = await createProject(parsed.data);
    await invalidateProjects();
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/projects/:id  (admin)
 * Non-stat fields only — hook, whatItDoes, stack, links, etc. No
 * `previousValue` involved: constraint C18's concurrency check is scoped to
 * project_stats, not the project row itself.
 */
projectsRouter.put("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw notFound("Unknown project");

    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid project fields");
    }

    const project = await updateProject(id, parsed.data);
    if (!project) throw notFound("Unknown project");

    await invalidateProjects();
    res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/:id/stats  (admin)
 * Adds a brand-new stat. `previousValue` must be absent/null — there is
 * nothing yet stored for a new row to confirm against (constraint C18).
 */
projectsRouter.post("/:id/stats", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw notFound("Unknown project");

    const parsed = newProjectStatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid stat");
    }

    const result = await createStat(id, parsed.data);
    if (result === "not_found") throw notFound("Unknown project");

    await invalidateProjects();
    res.status(201).json({ stat: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/projects/:id/stats/:statId  (admin)
 *
 * Constraint C18, backend half. The body MUST include `previousValue` — the
 * value the admin UI displayed and the owner confirmed as current. The write
 * is rejected with `409 Conflict` (and the row's real current value, so the
 * caller can re-show the confirm dialog) unless `previousValue` exactly
 * matches what's actually stored, checked atomically inside a single UPDATE
 * (see `projectsRepo.updateStatIfMatches`) — never a separate read followed
 * by a racy write. This is what stops a direct API call that skips the
 * confirm dialog from silently overwriting a stat; it does not judge whether
 * the new value is "reasonable," only that the confirmation was grounded in
 * the real current data.
 */
projectsRouter.put("/:id/stats/:statId", requireAdmin, async (req, res, next) => {
  try {
    const { id, statId } = req.params;
    if (!isUuid(id)) throw notFound("Unknown project");
    if (!isUuid(statId)) throw notFound("Unknown stat");

    const parsed = updateProjectStatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid stat");
    }

    const { previousValue, ...input } = parsed.data;
    const result = await updateStatIfMatches(id, statId, previousValue, input);

    if (result.status === "not_found") {
      throw notFound("Unknown stat");
    }
    if (result.status === "conflict") {
      res.status(409).json({
        error: "This stat has changed since it was loaded — confirm the current value.",
        currentValue: result.currentValue,
      });
      return;
    }

    await invalidateProjects();
    res.status(200).json({ stat: result.stat });
  } catch (err) {
    next(err);
  }
});

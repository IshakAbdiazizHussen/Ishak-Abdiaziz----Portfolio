import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { listGroups, createGroup, updateGroup, createItem, updateItem } from "../lib/toolboxRepo";
import {
  newToolboxGroupSchema,
  updateToolboxGroupSchema,
  newToolboxItemSchema,
  updateToolboxItemSchema,
  uuidParam,
} from "../lib/validation";
import { readCachedToolbox, writeCachedToolbox, invalidateToolbox } from "../lib/toolboxCache";
import { badRequest, notFound } from "../lib/errors";

export const toolboxRouter = Router();

function isUuid(value: string | undefined): value is string {
  return !!value && uuidParam.safeParse(value).success;
}

/**
 * GET /api/toolbox  (public)
 * All groups with their items, ordered by sort_order. Served from the Redis
 * cache when warm; a miss/error falls through to Postgres (fail open) — same
 * pattern as GET /api/log, GET /api/content/:area, GET /api/projects.
 */
toolboxRouter.get("/", async (_req, res, next) => {
  try {
    const cached = await readCachedToolbox();
    if (cached) {
      res.status(200).json({ groups: cached });
      return;
    }
    const groups = await listGroups();
    await writeCachedToolbox(groups);
    res.status(200).json({ groups });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/toolbox/groups  (admin)
 * No confirm-before-save — that mechanism is C18/project-stats only.
 */
toolboxRouter.post("/groups", requireAdmin, async (req, res, next) => {
  try {
    const parsed = newToolboxGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid group");
    }
    const group = await createGroup(parsed.data);
    await invalidateToolbox();
    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/toolbox/groups/:id  (admin)
 * Rename and/or reorder a group. No confirm-before-save.
 */
toolboxRouter.put("/groups/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw notFound("Unknown group");

    const parsed = updateToolboxGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid group fields");
    }

    const group = await updateGroup(id, parsed.data);
    if (!group) throw notFound("Unknown group");

    await invalidateToolbox();
    res.status(200).json({ group });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/toolbox/groups/:id/items  (admin)
 * Adds an item to an existing group. A non-existent `:id` → 404, never a
 * dangling FK. No confirm-before-save.
 */
toolboxRouter.post("/groups/:id/items", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw notFound("Unknown group");

    const parsed = newToolboxItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid item");
    }

    const result = await createItem(id, parsed.data);
    if (result === "not_found") throw notFound("Unknown group");

    await invalidateToolbox();
    res.status(201).json({ item: result });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/toolbox/items/:id  (admin)
 * Edit an item's name/note/order, optionally moving it to a different group
 * via `groupId` — which must already exist (400 if not, never a dangling
 * FK). No confirm-before-save — plain create/update, nothing more
 * (constraint C18 does not apply to Toolbox).
 */
toolboxRouter.put("/items/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) throw notFound("Unknown item");

    const parsed = updateToolboxItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid item fields");
    }

    const result = await updateItem(id, parsed.data);
    if (result === "group_not_found") throw badRequest("Unknown groupId");
    if (result === "not_found") throw notFound("Unknown item");

    await invalidateToolbox();
    res.status(200).json({ item: result });
  } catch (err) {
    next(err);
  }
});

import { sql } from "./db";
import type { ToolboxGroup, ToolboxItem } from "./types";

/**
 * All `toolbox_groups`/`toolbox_items` SQL lives here. Queries are
 * parameterized; routes never build SQL.
 *
 * Deliberately no `previousValue`/optimistic-concurrency mechanism anywhere
 * in this file — that is constraint C18's, specific to `project_stats`
 * (feature 14). Toolbox writes are plain create/update, nothing more.
 */

interface GroupRow {
  id: string;
  name: string;
  sort_order: number;
}

interface ItemRow {
  id: string;
  group_id: string;
  name: string;
  note: string | null;
  sort_order: number;
}

function toItem(row: ItemRow): ToolboxItem {
  return { id: row.id, name: row.name, note: row.note };
}

async function itemsFor(groupId: string): Promise<ToolboxItem[]> {
  const rows = await sql<ItemRow[]>`
    select * from toolbox_items where group_id = ${groupId} order by sort_order asc
  `;
  return rows.map(toItem);
}

export async function listGroups(): Promise<ToolboxGroup[]> {
  const groupRows = await sql<GroupRow[]>`select * from toolbox_groups order by sort_order asc`;
  const itemRows = await sql<ItemRow[]>`select * from toolbox_items order by sort_order asc`;

  const itemsByGroup = new Map<string, ToolboxItem[]>();
  for (const row of itemRows) {
    const list = itemsByGroup.get(row.group_id) ?? [];
    list.push(toItem(row));
    itemsByGroup.set(row.group_id, list);
  }

  return groupRows.map((row) => ({
    id: row.id,
    name: row.name,
    items: itemsByGroup.get(row.id) ?? [],
  }));
}

export interface NewGroupInput {
  name: string;
  sortOrder?: number;
}

/** Create a group. Omitting `sortOrder` appends it after the current last group. */
export async function createGroup(input: NewGroupInput): Promise<ToolboxGroup> {
  const rows =
    input.sortOrder !== undefined
      ? await sql<GroupRow[]>`
          insert into toolbox_groups (name, sort_order)
          values (${input.name}, ${input.sortOrder})
          returning *
        `
      : await sql<GroupRow[]>`
          insert into toolbox_groups (name, sort_order)
          values (
            ${input.name},
            coalesce((select max(sort_order) + 1 from toolbox_groups), 0)
          )
          returning *
        `;
  const row = rows[0];
  if (!row) throw new Error("insert returned no row");
  return { id: row.id, name: row.name, items: [] };
}

export interface UpdateGroupInput {
  name?: string;
  sortOrder?: number;
}

/** Update a group's name/order. Returns `null` if the group doesn't exist. */
export async function updateGroup(
  id: string,
  fields: UpdateGroupInput,
): Promise<ToolboxGroup | null> {
  const dbFields: Record<string, unknown> = {};
  if (fields.name !== undefined) dbFields.name = fields.name;
  if (fields.sortOrder !== undefined) dbFields.sort_order = fields.sortOrder;
  const columns = Object.keys(dbFields);

  if (columns.length > 0) {
    await sql`
      update toolbox_groups
      set ${sql(dbFields, ...columns)}, updated_at = now()
      where id = ${id}
    `;
  }

  const rows = await sql<GroupRow[]>`select * from toolbox_groups where id = ${id}`;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, name: row.name, items: await itemsFor(id) };
}

export interface NewItemInput {
  name: string;
  note?: string | null;
  sortOrder?: number;
}

/**
 * Add an item to a group. Returns `"not_found"` if the group doesn't exist —
 * the caller must not create a dangling FK. Omitting `sortOrder` appends the
 * item after the current last item in that group.
 */
export async function createItem(
  groupId: string,
  input: NewItemInput,
): Promise<ToolboxItem | "not_found"> {
  const group = await sql`select 1 from toolbox_groups where id = ${groupId}`;
  if (group.length === 0) return "not_found";

  const rows =
    input.sortOrder !== undefined
      ? await sql<ItemRow[]>`
          insert into toolbox_items (group_id, name, note, sort_order)
          values (${groupId}, ${input.name}, ${input.note ?? null}, ${input.sortOrder})
          returning *
        `
      : await sql<ItemRow[]>`
          insert into toolbox_items (group_id, name, note, sort_order)
          values (
            ${groupId}, ${input.name}, ${input.note ?? null},
            coalesce(
              (select max(sort_order) + 1 from toolbox_items where group_id = ${groupId}),
              0
            )
          )
          returning *
        `;
  const row = rows[0];
  if (!row) throw new Error("insert returned no row");
  return toItem(row);
}

export interface UpdateItemInput {
  name?: string;
  note?: string | null;
  sortOrder?: number;
  groupId?: string;
}

export type UpdateItemResult = ToolboxItem | "not_found" | "group_not_found";

/**
 * Update an item's name/note/order, optionally moving it to a different
 * group. If `groupId` is given, it MUST already exist — this is checked
 * before the write, so an item is never left pointing at a non-existent
 * group (a dangling FK would otherwise be possible if the check only
 * happened at the database level and was swallowed).
 */
export async function updateItem(id: string, fields: UpdateItemInput): Promise<UpdateItemResult> {
  if (fields.groupId !== undefined) {
    const group = await sql`select 1 from toolbox_groups where id = ${fields.groupId}`;
    if (group.length === 0) return "group_not_found";
  }

  const dbFields: Record<string, unknown> = {};
  if (fields.name !== undefined) dbFields.name = fields.name;
  if (fields.note !== undefined) dbFields.note = fields.note;
  if (fields.sortOrder !== undefined) dbFields.sort_order = fields.sortOrder;
  if (fields.groupId !== undefined) dbFields.group_id = fields.groupId;
  const columns = Object.keys(dbFields);

  if (columns.length > 0) {
    await sql`
      update toolbox_items
      set ${sql(dbFields, ...columns)}, updated_at = now()
      where id = ${id}
    `;
  }

  const rows = await sql<ItemRow[]>`select * from toolbox_items where id = ${id}`;
  const row = rows[0];
  if (!row) return "not_found";
  return toItem(row);
}

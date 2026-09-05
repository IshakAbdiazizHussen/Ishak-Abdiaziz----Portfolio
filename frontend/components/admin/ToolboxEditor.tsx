"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { BackendError } from "@/lib/backend";
import {
  getToolbox,
  createToolboxGroup,
  updateToolboxGroup,
  createToolboxItem,
  updateToolboxItem,
  NotAuthenticatedError,
} from "@/lib/admin";
import type { ToolboxGroup, ToolboxItem } from "@/lib/types";
import { SavedIndicator, type SaveStatus } from "./SavedIndicator";
import styles from "./ToolboxEditor.module.css";

interface SessionProps {
  onSessionExpired: () => void;
}

/**
 * Deliberately NO confirm-before-save anywhere in this file — constraint
 * C18's concurrency check is specific to Built project stats (feature 14);
 * Toolbox entries are a curated list, not a factual/verifiable claim, and
 * feature 15's QA established this difference is intentional. Every write
 * below is a plain create/update, then a full reload from `GET /api/toolbox`
 * — the API deliberately does not expose `sort_order` as a readable field
 * (see `backend/src/lib/types.ts`), so "order" here is Move up/down, which
 * only ever needs array position, never a numeric value to display or trust.
 */
export function ToolboxEditor({ onSessionExpired }: SessionProps) {
  const [groups, setGroups] = useState<ToolboxGroup[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(() => {
    getToolbox()
      .then((g) => {
        setGroups(g);
        setLoadError("");
      })
      .catch(() => setLoadError("Couldn't load Toolbox. Is the backend running?"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveGroup(index: number, direction: -1 | 1) {
    if (!groups) return;
    const otherIndex = index + direction;
    const current = groups[index];
    const other = groups[otherIndex];
    if (!current || !other) return;
    try {
      await Promise.all([
        updateToolboxGroup(current.id, { sortOrder: otherIndex }),
        updateToolboxGroup(other.id, { sortOrder: index }),
      ]);
      load();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      // A failed reorder just leaves the list as it was; nothing here is
      // left half-applied since load() always re-syncs from the server.
    }
  }

  if (loadError) return <p className={styles.notice}>{loadError}</p>;
  if (!groups) return <p className={styles.notice}>Loading…</p>;

  return (
    <div className={styles.editor}>
      {groups.map((group, index) => (
        <ToolboxGroupCard
          key={group.id}
          group={group}
          canMoveUp={index > 0}
          canMoveDown={index < groups.length - 1}
          onMove={(direction) => moveGroup(index, direction)}
          onSaved={load}
          onSessionExpired={onSessionExpired}
        />
      ))}
      <AddGroupForm onCreated={load} onSessionExpired={onSessionExpired} />
    </div>
  );
}

function ToolboxGroupCard({
  group,
  canMoveUp,
  canMoveDown,
  onMove,
  onSaved,
  onSessionExpired,
}: {
  group: ToolboxGroup;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onSaved: () => void;
} & SessionProps) {
  const uid = useId();
  const [name, setName] = useState(group.name);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  async function onSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;
    setStatus("working");
    setMessage("Saving…");
    try {
      await updateToolboxGroup(group.id, { name: trimmed });
      setStatus("done");
      setMessage("Saved.");
      onSaved();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setStatus("error");
      setMessage(err instanceof BackendError ? err.message : "Couldn't save.");
    }
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    const current = group.items[index];
    const other = group.items[otherIndex];
    if (!current || !other) return;
    try {
      await Promise.all([
        updateToolboxItem(current.id, { sortOrder: otherIndex }),
        updateToolboxItem(other.id, { sortOrder: index }),
      ]);
      onSaved();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
    }
  }

  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <label className={styles.field}>
          <span className={styles.srOnly}>Group name</span>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.groupNameInput}
          />
        </label>
        <div className={styles.moveButtons}>
          <button
            type="button"
            className="button-ghost"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
            aria-label="Move group up"
          >
            ↑
          </button>
          <button
            type="button"
            className="button-ghost"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
            aria-label="Move group down"
          >
            ↓
          </button>
          <button type="button" className="button-ghost" onClick={onSaveName}>
            Save
          </button>
        </div>
      </div>
      <SavedIndicator status={status} message={message} />

      <ul className={styles.items}>
        {group.items.map((item, index) => (
          <ToolboxItemRow
            key={item.id}
            item={item}
            canMoveUp={index > 0}
            canMoveDown={index < group.items.length - 1}
            onMove={(direction) => moveItem(index, direction)}
            onSaved={onSaved}
            onSessionExpired={onSessionExpired}
          />
        ))}
      </ul>

      <AddItemForm groupId={group.id} onCreated={onSaved} onSessionExpired={onSessionExpired} />
    </section>
  );
}

function ToolboxItemRow({
  item,
  canMoveUp,
  canMoveDown,
  onMove,
  onSaved,
  onSessionExpired,
}: {
  item: ToolboxItem;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onSaved: () => void;
} & SessionProps) {
  const [name, setName] = useState(item.name);
  const [note, setNote] = useState(item.note ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  const dirty = name.trim() !== item.name || note.trim() !== (item.note ?? "");

  async function onSave() {
    if (!dirty || !name.trim()) return;
    setStatus("working");
    setMessage("Saving…");
    try {
      await updateToolboxItem(item.id, { name: name.trim(), note: note.trim() ? note.trim() : null });
      setStatus("done");
      setMessage("Saved.");
      onSaved();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setStatus("error");
      setMessage(err instanceof BackendError ? err.message : "Couldn't save.");
    }
  }

  return (
    <li className={styles.item}>
      <input
        aria-label="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={styles.itemNameInput}
      />
      <input
        aria-label="Item note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={styles.itemNoteInput}
      />
      <div className={styles.moveButtons}>
        <button
          type="button"
          className="button-ghost"
          disabled={!canMoveUp}
          onClick={() => onMove(-1)}
          aria-label="Move item up"
        >
          ↑
        </button>
        <button
          type="button"
          className="button-ghost"
          disabled={!canMoveDown}
          onClick={() => onMove(1)}
          aria-label="Move item down"
        >
          ↓
        </button>
        <button type="button" className="button-ghost" onClick={onSave} disabled={!dirty}>
          Save
        </button>
      </div>
      {status === "error" ? <span className={styles.itemError}>{message}</span> : null}
    </li>
  );
}

function AddGroupForm({ onCreated, onSessionExpired }: { onCreated: () => void } & SessionProps) {
  const uid = useId();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStatus("working");
    setMessage("Adding…");
    try {
      await createToolboxGroup({ name: trimmed });
      setName("");
      setStatus("done");
      setMessage("Added.");
      onCreated();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setStatus("error");
      setMessage(err instanceof BackendError ? err.message : "Couldn't add the group.");
    }
  }

  return (
    <form className={styles.addForm} onSubmit={onSubmit}>
      <label htmlFor={`${uid}-newgroup`} className={styles.srOnly}>
        New group name
      </label>
      <input
        id={`${uid}-newgroup`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New group name"
        className={styles.groupNameInput}
      />
      <button type="submit" className="button-ghost" disabled={!name.trim()}>
        + Add group
      </button>
      <SavedIndicator status={status} message={message} />
    </form>
  );
}

function AddItemForm({
  groupId,
  onCreated,
  onSessionExpired,
}: { groupId: string; onCreated: () => void } & SessionProps) {
  const uid = useId();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setStatus("working");
    setMessage("Adding…");
    try {
      await createToolboxItem(groupId, { name: trimmed, note: note.trim() ? note.trim() : null });
      setName("");
      setNote("");
      setStatus("done");
      setMessage("Added.");
      onCreated();
    } catch (err) {
      if (err instanceof NotAuthenticatedError) return onSessionExpired();
      setStatus("error");
      setMessage(err instanceof BackendError ? err.message : "Couldn't add the item.");
    }
  }

  return (
    <form className={styles.addForm} onSubmit={onSubmit}>
      <label htmlFor={`${uid}-newitem-name`} className={styles.srOnly}>
        New item name
      </label>
      <input
        id={`${uid}-newitem-name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New tool name"
        className={styles.itemNameInput}
      />
      <label htmlFor={`${uid}-newitem-note`} className={styles.srOnly}>
        New item note
      </label>
      <input
        id={`${uid}-newitem-note`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className={styles.itemNoteInput}
      />
      <button type="submit" className="button-ghost" disabled={!name.trim()}>
        + Add item
      </button>
      <SavedIndicator status={status} message={message} />
    </form>
  );
}

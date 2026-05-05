import { Hono } from "hono";
import type { Env } from "../types";
import { requireAdmin } from "../middleware/auth";
import { deleteR2Keys, isR2Key } from "../lib/r2";
import {
  deltaPersonItemCount,
  deltaTweetCounts,
  deltaTweetStarredOnly,
  type PersonCountKind,
} from "../lib/personItemCounts";
import { tapD1First, tapD1Meta } from "../lib/d1DevLog";
import { rebuildTweetIndex } from "../lib/tweetIndex";

interface FieldSpec {
  name: string;
  required?: boolean;
  json?: boolean;
  /** Store as INTEGER 0/1 (SQLite); accept boolean or 0/1 from JSON body */
  intBool?: boolean;
}

interface ItemTableSpec {
  table: string;
  fields: FieldSpec[];
  imageFields?: {
    single?: string[];
    multiJson?: string[];
  };
}

const SPECS: Record<string, ItemTableSpec> = {
  books: {
    table: "books",
    fields: [
      { name: "title", required: true },
      { name: "url" },
      { name: "cover" },
    ],
    imageFields: { single: ["cover"] },
  },
  articles: {
    table: "articles",
    fields: [
      { name: "title", required: true },
      { name: "content" },
    ],
  },
  videos: {
    table: "videos",
    fields: [
      { name: "title", required: true },
      { name: "url" },
    ],
  },
  podcasts: {
    table: "podcasts",
    fields: [
      { name: "title", required: true },
      { name: "url" },
    ],
  },
  tweets: {
    table: "tweets",
    fields: [
      { name: "datetime" },
      { name: "content" },
      { name: "metadata" },
      { name: "imgs", json: true },
      { name: "starred", intBool: true },
    ],
    imageFields: { multiJson: ["imgs"] },
  },
  answers: {
    table: "answers",
    fields: [
      { name: "datetime" },
      { name: "question" },
      { name: "content" },
      { name: "metadata" },
    ],
  },
};

function pickPayload(spec: ItemTableSpec, body: Record<string, unknown>) {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const f of spec.fields) {
    if (!(f.name in body)) continue;
    let v: unknown = body[f.name];
    if (v === undefined) continue;
    if (f.intBool) {
      v = v === true || v === 1 || v === "1" ? 1 : 0;
    }
    if (f.json) {
      v = JSON.stringify(Array.isArray(v) ? v : []);
    }
    cols.push(f.name);
    vals.push(v);
  }
  return { cols, vals };
}

function ensureRequired(spec: ItemTableSpec, body: Record<string, unknown>): string | null {
  for (const f of spec.fields) {
    if (f.required) {
      const v = body[f.name];
      if (v === undefined || v === null || v === "") {
        return `${f.name} is required`;
      }
    }
  }
  return null;
}

function readImgs(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

const items = new Hono<{ Bindings: Env }>();

// Create: POST /api/v1/people/:personId/<kind>
items.post("/people/:personId/:kind", requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  const spec = SPECS[kind];
  if (!spec) return c.json({ error: "Unknown item kind" }, 404);

  const personId = c.req.param("personId");
  const personExists = await tapD1First(
    c.env,
    "POST item: person exists",
    c.env.DB.prepare("SELECT 1 FROM people WHERE id = ?").bind(personId),
  );
  if (!personExists) return c.json({ error: "Person not found" }, 404);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const missing = ensureRequired(spec, body);
  if (missing) return c.json({ error: missing }, 400);

  const { cols, vals } = pickPayload(spec, body);
  const allCols = ["person_id", ...cols, "created_at", "updated_at"];
  const now = Date.now();
  const placeholders = allCols.map(() => "?").join(", ");
  const sql = `INSERT INTO ${spec.table} (${allCols.join(", ")}) VALUES (${placeholders}) RETURNING *`;
  const row = await tapD1First<Record<string, unknown>>(
    c.env,
    `POST item (${kind}): insert`,
    c.env.DB.prepare(sql).bind(personId, ...vals, now, now),
  );
  if (!row) {
    return c.json({ error: "Insert failed" }, 500);
  }

  if (kind === "tweets") {
    const ds = Number((row as { starred?: unknown }).starred) === 1 ? 1 : 0;
    await deltaTweetCounts(c.env.KV, personId, 1, ds);
    await rebuildTweetIndex(c.env.DB, c.env.KV, personId, c.env);
  } else {
    await deltaPersonItemCount(c.env.KV, personId, kind as PersonCountKind, 1);
  }

  return c.json(row, 201);
});

// Update: PUT /api/v1/<kind>/:itemId
items.put("/:kind/:itemId", requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  const spec = SPECS[kind];
  if (!spec) return c.json({ error: "Unknown item kind" }, 404);
  const itemId = Number(c.req.param("itemId"));
  if (!Number.isFinite(itemId)) return c.json({ error: "Invalid item id" }, 400);

  const current = await tapD1First<Record<string, unknown>>(
    c.env,
    `PUT item (${kind}): load current`,
    c.env.DB.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).bind(itemId),
  );
  if (!current) return c.json({ error: "Item not found" }, 404);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const { cols, vals } = pickPayload(spec, body);
  if (cols.length === 0) {
    return c.json(current);
  }

  const now = Date.now();
  const setClause = [...cols.map((c2) => `${c2} = ?`), "updated_at = ?"].join(", ");
  const sql = `UPDATE ${spec.table} SET ${setClause} WHERE id = ? RETURNING *`;
  const updated = await tapD1First<Record<string, unknown>>(
    c.env,
    `PUT item (${kind}): update`,
    c.env.DB.prepare(sql).bind(...vals, now, itemId),
  );

  // Detect single-image fields that changed and clean up old R2 keys.
  const r2KeysToDelete: string[] = [];
  for (const field of spec.imageFields?.single ?? []) {
    if (field in body) {
      const oldVal = current[field] as string | null;
      const newVal = body[field] as string | null;
      if (oldVal && oldVal !== newVal && isR2Key(oldVal)) {
        r2KeysToDelete.push(oldVal);
      }
    }
  }
  await deleteR2Keys(c.env, r2KeysToDelete);

  if (kind === "tweets" && updated) {
    const pid = String(current.person_id);
    if ("starred" in body) {
      const oldStarred = Number(current.starred) === 1;
      const newStarred = Number((updated as { starred: unknown }).starred) === 1;
      if (oldStarred !== newStarred) {
        await deltaTweetStarredOnly(c.env.KV, pid, newStarred ? 1 : -1);
      }
    }
    if ("datetime" in body || "starred" in body) {
      await rebuildTweetIndex(c.env.DB, c.env.KV, pid, c.env);
    }
  }

  return c.json(updated);
});

// Delete: DELETE /api/v1/<kind>/:itemId
items.delete("/:kind/:itemId", requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  const spec = SPECS[kind];
  if (!spec) return c.json({ error: "Unknown item kind" }, 404);
  const itemId = Number(c.req.param("itemId"));
  if (!Number.isFinite(itemId)) return c.json({ error: "Invalid item id" }, 400);

  const row = await tapD1First<Record<string, unknown>>(
    c.env,
    `DELETE item (${kind}): load`,
    c.env.DB.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`).bind(itemId),
  );
  if (!row) return c.json({ error: "Item not found" }, 404);

  await tapD1Meta(
    c.env,
    `DELETE item (${kind})`,
    c.env.DB.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).bind(itemId).run(),
  );

  const personId = String(row.person_id);
  if (kind === "tweets") {
    const ds = Number(row.starred) === 1 ? 1 : 0;
    await deltaTweetCounts(c.env.KV, personId, -1, -ds);
    await rebuildTweetIndex(c.env.DB, c.env.KV, personId, c.env);
  } else {
    await deltaPersonItemCount(c.env.KV, personId, kind as PersonCountKind, -1);
  }

  const r2Keys: string[] = [];
  for (const field of spec.imageFields?.single ?? []) {
    const v = row[field] as string | null;
    if (v && isR2Key(v)) r2Keys.push(v);
  }
  for (const field of spec.imageFields?.multiJson ?? []) {
    for (const k of readImgs(row[field])) {
      if (isR2Key(k)) r2Keys.push(k);
    }
  }
  await deleteR2Keys(c.env, r2Keys);

  return c.json({ ok: true });
});

export default items;

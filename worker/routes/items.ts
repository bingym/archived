import { Hono } from "hono";
import type { Env } from "../types";
import { requireAdmin } from "../middleware/auth";
import { deleteR2Keys, isR2Key } from "../lib/r2";

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
  const personExists = await c.env.DB.prepare("SELECT 1 FROM people WHERE id = ?")
    .bind(personId)
    .first();
  if (!personExists) return c.json({ error: "Person not found" }, 404);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const missing = ensureRequired(spec, body);
  if (missing) return c.json({ error: missing }, 400);

  const { cols, vals } = pickPayload(spec, body);
  const allCols = ["person_id", ...cols, "created_at", "updated_at"];
  const now = Date.now();
  const placeholders = allCols.map(() => "?").join(", ");
  const sql = `INSERT INTO ${spec.table} (${allCols.join(", ")}) VALUES (${placeholders}) RETURNING *`;
  const row = await c.env.DB.prepare(sql)
    .bind(personId, ...vals, now, now)
    .first<Record<string, unknown>>();

  return c.json(row, 201);
});

// Update: PUT /api/v1/<kind>/:itemId
items.put("/:kind/:itemId", requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  const spec = SPECS[kind];
  if (!spec) return c.json({ error: "Unknown item kind" }, 404);
  const itemId = Number(c.req.param("itemId"));
  if (!Number.isFinite(itemId)) return c.json({ error: "Invalid item id" }, 400);

  const current = await c.env.DB.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`)
    .bind(itemId)
    .first<Record<string, unknown>>();
  if (!current) return c.json({ error: "Item not found" }, 404);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const { cols, vals } = pickPayload(spec, body);
  if (cols.length === 0) {
    return c.json(current);
  }

  const now = Date.now();
  const setClause = [...cols.map((c2) => `${c2} = ?`), "updated_at = ?"].join(", ");
  const sql = `UPDATE ${spec.table} SET ${setClause} WHERE id = ? RETURNING *`;
  const updated = await c.env.DB.prepare(sql)
    .bind(...vals, now, itemId)
    .first<Record<string, unknown>>();

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

  return c.json(updated);
});

// Delete: DELETE /api/v1/<kind>/:itemId
items.delete("/:kind/:itemId", requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  const spec = SPECS[kind];
  if (!spec) return c.json({ error: "Unknown item kind" }, 404);
  const itemId = Number(c.req.param("itemId"));
  if (!Number.isFinite(itemId)) return c.json({ error: "Invalid item id" }, 400);

  const row = await c.env.DB.prepare(`SELECT * FROM ${spec.table} WHERE id = ?`)
    .bind(itemId)
    .first<Record<string, unknown>>();
  if (!row) return c.json({ error: "Item not found" }, 404);

  await c.env.DB.prepare(`DELETE FROM ${spec.table} WHERE id = ?`).bind(itemId).run();

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

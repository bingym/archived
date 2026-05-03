import { Hono } from "hono";
import type { Env, Person, TweetRow, Tweet } from "../types";
import { requireAdmin } from "../middleware/auth";
import { deleteR2Keys, isR2Key } from "../lib/r2";

const people = new Hono<{ Bindings: Env }>();

function parseImgs(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function tweetRowToApi(row: TweetRow): Tweet {
  return {
    id: row.id,
    person_id: row.person_id,
    datetime: row.datetime,
    content: row.content,
    metadata: row.metadata,
    imgs: parseImgs(row.imgs),
    starred: Number(row.starred) === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

people.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, avatar, description FROM people ORDER BY id ASC"
  ).all<Pick<Person, "id" | "name" | "avatar" | "description">>();
  return c.json(results);
});

const ITEM_LIST_KINDS = {
  books: "books",
  articles: "articles",
  videos: "videos",
  podcasts: "podcasts",
  tweets: "tweets",
  answers: "answers",
} as const;
type ItemListKind = keyof typeof ITEM_LIST_KINDS;

const DEFAULT_ITEM_PAGE_SIZE = 50;
const MAX_ITEM_PAGE_SIZE = 100;

/** 分页拉取某人的一类条目（两段路径须与 `GET /:id` 区分）。 */
people.get("/:id/:kind", async (c) => {
  const id = c.req.param("id");
  const kind = c.req.param("kind") as ItemListKind;
  if (!(kind in ITEM_LIST_KINDS)) {
    return c.json({ error: "Unknown item kind" }, 400);
  }
  const table = ITEM_LIST_KINDS[kind];

  const person = await c.env.DB.prepare("SELECT 1 FROM people WHERE id = ?").bind(id).first();
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }

  const page = Math.max(1, Number.parseInt(c.req.query("page") ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(c.req.query("pageSize") ?? String(DEFAULT_ITEM_PAGE_SIZE), 10) || DEFAULT_ITEM_PAGE_SIZE;
  const pageSize = Math.min(MAX_ITEM_PAGE_SIZE, Math.max(1, pageSizeRaw));
  const offset = (page - 1) * pageSize;

  const orderSql = kind === "tweets" ? "datetime DESC, id DESC" : "id ASC";

  let tweetsStarredSql = "";
  if (kind === "tweets") {
    const sp = c.req.query("starred");
    if (sp === "1" || sp === "true") tweetsStarredSql = " AND starred = 1";
    else if (sp === "0" || sp === "false") tweetsStarredSql = " AND starred = 0";
  }

  const [countRes, rowsRes] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT COUNT(*) as n FROM ${table} WHERE person_id = ?${tweetsStarredSql}`).bind(id),
    c.env.DB
      .prepare(`SELECT * FROM ${table} WHERE person_id = ?${tweetsStarredSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`)
      .bind(id, pageSize, offset),
  ]);

  const total = Number((countRes.results?.[0] as { n?: number } | undefined)?.n ?? 0);
  let items: unknown[] = rowsRes.results ?? [];
  if (kind === "tweets") {
    items = (rowsRes.results as TweetRow[]).map(tweetRowToApi);
  }

  return c.json({ items, total, page, pageSize });
});

people.get("/:id", async (c) => {
  const id = c.req.param("id");
  const person = await c.env.DB.prepare(
    "SELECT id, name, avatar, description, created_at, updated_at FROM people WHERE id = ?"
  )
    .bind(id)
    .first<Person>();
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }

  const [booksC, articlesC, videosC, podcastsC, tweetsC, answersC] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT COUNT(*) as n FROM books WHERE person_id = ?").bind(id),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM articles WHERE person_id = ?").bind(id),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM videos WHERE person_id = ?").bind(id),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM podcasts WHERE person_id = ?").bind(id),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tweets WHERE person_id = ?").bind(id),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM answers WHERE person_id = ?").bind(id),
  ]);

  const n = (r: typeof booksC) => Number((r.results?.[0] as { n?: number } | undefined)?.n ?? 0);

  return c.json({
    id: person.id,
    name: person.name,
    avatar: person.avatar,
    description: person.description,
    counts: {
      books: n(booksC),
      articles: n(articlesC),
      videos: n(videosC),
      podcasts: n(podcastsC),
      tweets: n(tweetsC),
      answers: n(answersC),
    },
  });
});

people.post("/", requireAdmin, async (c) => {
  const body = await c.req.json<{ id?: string; name?: string; avatar?: string | null; description?: string | null }>();
  const id = (body.id ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!id || !name) {
    return c.json({ error: "id and name are required" }, 400);
  }
  const exists = await c.env.DB.prepare("SELECT 1 FROM people WHERE id = ?").bind(id).first();
  if (exists) {
    return c.json({ error: "Person already exists" }, 409);
  }
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO people (id, name, avatar, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, name, body.avatar ?? null, body.description ?? null, now, now)
    .run();
  return c.json({ id, name, avatar: body.avatar ?? null, description: body.description ?? null }, 201);
});

people.put("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; avatar?: string | null; description?: string | null }>();
  const current = await c.env.DB.prepare(
    "SELECT id, name, avatar, description FROM people WHERE id = ?"
  )
    .bind(id)
    .first<Pick<Person, "id" | "name" | "avatar" | "description">>();
  if (!current) {
    return c.json({ error: "Person not found" }, 404);
  }

  const next = {
    name: body.name !== undefined ? body.name : current.name,
    avatar: body.avatar !== undefined ? body.avatar : current.avatar,
    description: body.description !== undefined ? body.description : current.description,
  };
  const now = Date.now();
  await c.env.DB.prepare(
    "UPDATE people SET name = ?, avatar = ?, description = ?, updated_at = ? WHERE id = ?"
  )
    .bind(next.name, next.avatar, next.description, now, id)
    .run();

  // Cleanup the old avatar from R2 if it was an R2 key and changed.
  if (
    body.avatar !== undefined &&
    current.avatar &&
    current.avatar !== body.avatar &&
    isR2Key(current.avatar)
  ) {
    await deleteR2Keys(c.env, [current.avatar]);
  }

  return c.json({ id, ...next });
});

people.delete("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");

  const person = await c.env.DB.prepare("SELECT avatar FROM people WHERE id = ?")
    .bind(id)
    .first<{ avatar: string | null }>();
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }

  const [coversRes, tweetImgsRes] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT cover FROM books WHERE person_id = ? AND cover IS NOT NULL").bind(id),
    c.env.DB.prepare("SELECT imgs FROM tweets WHERE person_id = ? AND imgs IS NOT NULL").bind(id),
  ]);

  const r2Keys: string[] = [];
  if (person.avatar && isR2Key(person.avatar)) r2Keys.push(person.avatar);
  for (const row of coversRes.results as Array<{ cover: string | null }>) {
    if (row.cover && isR2Key(row.cover)) r2Keys.push(row.cover);
  }
  for (const row of tweetImgsRes.results as Array<{ imgs: string | null }>) {
    for (const k of parseImgs(row.imgs)) {
      if (isR2Key(k)) r2Keys.push(k);
    }
  }

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM books WHERE person_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM articles WHERE person_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM videos WHERE person_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM podcasts WHERE person_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM tweets WHERE person_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM answers WHERE person_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM people WHERE id = ?").bind(id),
  ]);

  await deleteR2Keys(c.env, r2Keys);

  return c.json({ ok: true });
});

export default people;

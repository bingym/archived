import { Hono } from "hono";
import type { Env, Person, TweetRow, Tweet } from "../types";
import { requireAdmin } from "../middleware/auth";
import { deleteR2Keys, isR2Key } from "../lib/r2";
import {
  deletePersonCountKeys,
  initPersonCountKeysZero,
  personCountKey,
  readCount,
  rebuildPersonCountsFromD1,
} from "../lib/personItemCounts";
import { tapD1BatchMeta, tapD1First, tapD1Meta } from "../lib/d1DevLog";
import {
  fetchCursorPageByIdAsc,
  fetchTweetsCursorPage,
  parseCursorDir,
} from "../lib/listCursor";

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
  const { results } = await tapD1Meta(
    c.env,
    "GET /people",
    c.env.DB.prepare("SELECT id, name, avatar, description FROM people ORDER BY id ASC").all<
      Pick<Person, "id" | "name" | "avatar" | "description">
    >(),
  );
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

const ITEM_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_ITEM_PAGE_SIZE = 20;

function normalizeItemPageSizeQuery(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_ITEM_PAGE_SIZE;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_ITEM_PAGE_SIZE;
  return (ITEM_PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_ITEM_PAGE_SIZE;
}

/** 须注册在 `/:id/:kind` 之前，避免 `kind` 误匹配 `rebuild-counts`。 */
people.post("/:id/rebuild-counts", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const person = await tapD1First(c.env, "POST rebuild-counts: person exists", c.env.DB.prepare("SELECT 1 FROM people WHERE id = ?").bind(id));
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }
  await rebuildPersonCountsFromD1(c.env.DB, c.env.KV, id, c.env);
  return c.json({ ok: true });
});

/** 分页拉取某人的一类条目（两段路径须与 `GET /:id` 区分）。 */
people.get("/:id/:kind", async (c) => {
  const id = c.req.param("id");
  const kind = c.req.param("kind") as ItemListKind;
  if (!(kind in ITEM_LIST_KINDS)) {
    return c.json({ error: "Unknown item kind" }, 400);
  }
  const table = ITEM_LIST_KINDS[kind];

  const person = await tapD1First(c.env, "GET /:id/:kind: person exists", c.env.DB.prepare("SELECT 1 FROM people WHERE id = ?").bind(id));
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }

  const pageSize = normalizeItemPageSizeQuery(c.req.query("pageSize"));
  const cursor = c.req.query("cursor") ?? null;
  const dir = parseCursorDir(c.req.query("dir"));

  if (kind === "tweets") {
    let tweetsStarredSql = "";
    const sp = c.req.query("starred");
    if (sp === "1" || sp === "true") {
      tweetsStarredSql = " AND starred = 1";
    }

    const result = await fetchTweetsCursorPage<TweetRow>(
      c.env,
      `GET /:id/:kind list (tweets)`,
      id,
      cursor,
      dir,
      pageSize,
      tweetsStarredSql,
    );

    return c.json({
      items: result.items.map(tweetRowToApi),
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor,
      pageSize,
    });
  }

  const result = await fetchCursorPageByIdAsc(
    c.env,
    `GET /:id/:kind list (${kind})`,
    table,
    id,
    cursor,
    dir,
    pageSize,
  );

  return c.json({
    items: result.items,
    nextCursor: result.nextCursor,
    prevCursor: result.prevCursor,
    pageSize,
  });
});

people.get("/:id", async (c) => {
  const id = c.req.param("id");
  const person = await tapD1First<Person>(
    c.env,
    "GET /:id person",
    c.env.DB.prepare("SELECT id, name, avatar, description, created_at, updated_at FROM people WHERE id = ?").bind(id),
  );
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }

  const kv = c.env.KV;
  const [books, articles, videos, podcasts, tweets, answers] = await Promise.all([
    readCount(kv, personCountKey(id, "books")),
    readCount(kv, personCountKey(id, "articles")),
    readCount(kv, personCountKey(id, "videos")),
    readCount(kv, personCountKey(id, "podcasts")),
    readCount(kv, personCountKey(id, "tweets")),
    readCount(kv, personCountKey(id, "answers")),
  ]);

  return c.json({
    id: person.id,
    name: person.name,
    avatar: person.avatar,
    description: person.description,
    counts: {
      books,
      articles,
      videos,
      podcasts,
      tweets,
      answers,
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
  const exists = await tapD1First(c.env, "POST /people: exists check", c.env.DB.prepare("SELECT 1 FROM people WHERE id = ?").bind(id));
  if (exists) {
    return c.json({ error: "Person already exists" }, 409);
  }
  const now = Date.now();
  await tapD1Meta(
    c.env,
    "POST /people: insert",
    c.env.DB
      .prepare(
        "INSERT INTO people (id, name, avatar, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(id, name, body.avatar ?? null, body.description ?? null, now, now)
      .run(),
  );
  await initPersonCountKeysZero(c.env.KV, id);
  return c.json({ id, name, avatar: body.avatar ?? null, description: body.description ?? null }, 201);
});

people.put("/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; avatar?: string | null; description?: string | null }>();
  const current = await tapD1First<Pick<Person, "id" | "name" | "avatar" | "description">>(
    c.env,
    "PUT /:id: load current",
    c.env.DB.prepare("SELECT id, name, avatar, description FROM people WHERE id = ?").bind(id),
  );
  if (!current) {
    return c.json({ error: "Person not found" }, 404);
  }

  const next = {
    name: body.name !== undefined ? body.name : current.name,
    avatar: body.avatar !== undefined ? body.avatar : current.avatar,
    description: body.description !== undefined ? body.description : current.description,
  };
  const now = Date.now();
  await tapD1Meta(
    c.env,
    "PUT /:id: update",
    c.env.DB
      .prepare("UPDATE people SET name = ?, avatar = ?, description = ?, updated_at = ? WHERE id = ?")
      .bind(next.name, next.avatar, next.description, now, id)
      .run(),
  );

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

  const person = await tapD1First<{ avatar: string | null }>(
    c.env,
    "DELETE /:id: avatar",
    c.env.DB.prepare("SELECT avatar FROM people WHERE id = ?").bind(id),
  );
  if (!person) {
    return c.json({ error: "Person not found" }, 404);
  }

  const [coversRes, tweetImgsRes] = await tapD1BatchMeta(
    c.env,
    "DELETE /:id: collect R2 refs",
    c.env.DB.batch([
      c.env.DB.prepare("SELECT cover FROM books WHERE person_id = ? AND cover IS NOT NULL").bind(id),
      c.env.DB.prepare("SELECT imgs FROM tweets WHERE person_id = ? AND imgs IS NOT NULL").bind(id),
    ]),
  );

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

  await tapD1BatchMeta(
    c.env,
    "DELETE /:id: cascade deletes",
    c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM books WHERE person_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM articles WHERE person_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM videos WHERE person_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM podcasts WHERE person_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM tweets WHERE person_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM answers WHERE person_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM people WHERE id = ?").bind(id),
    ]),
  );

  await deletePersonCountKeys(c.env.KV, id);

  await deleteR2Keys(c.env, r2Keys);

  return c.json({ ok: true });
});

export default people;

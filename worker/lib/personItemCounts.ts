/** KV key prefix for per-person item counts (see wrangler `KV` binding). */
const PREFIX = "v1:pc";

export type PersonCountKind = "books" | "articles" | "videos" | "podcasts" | "answers";

export function personCountKey(personId: string, suffix: string): string {
  return `${PREFIX}:${personId}:${suffix}`;
}

export function allPersonCountKeys(personId: string): string[] {
  return [
    personCountKey(personId, "books"),
    personCountKey(personId, "articles"),
    personCountKey(personId, "videos"),
    personCountKey(personId, "podcasts"),
    personCountKey(personId, "answers"),
    personCountKey(personId, "tweets"),
    personCountKey(personId, "tweets:starred"),
  ];
}

export async function readCount(kv: KVNamespace, key: string): Promise<number> {
  const v = await kv.get(key);
  if (v == null || v === "") return 0;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function writeCount(kv: KVNamespace, key: string, n: number): Promise<void> {
  const clamped = Math.max(0, n);
  if (clamped === 0) {
    await kv.delete(key);
  } else {
    await kv.put(key, String(clamped));
  }
}

export async function deltaPersonItemCount(
  kv: KVNamespace,
  personId: string,
  kind: PersonCountKind,
  delta: number,
): Promise<void> {
  const key = personCountKey(personId, kind);
  const cur = await readCount(kv, key);
  await writeCount(kv, key, cur + delta);
}

/** Adjust tweet total and/or starred count (insert/delete). */
export async function deltaTweetCounts(
  kv: KVNamespace,
  personId: string,
  deltaTotal: number,
  deltaStarred: number,
): Promise<void> {
  const totalKey = personCountKey(personId, "tweets");
  const starredKey = personCountKey(personId, "tweets:starred");
  const t = (await readCount(kv, totalKey)) + deltaTotal;
  const s = (await readCount(kv, starredKey)) + deltaStarred;
  await writeCount(kv, totalKey, t);
  await writeCount(kv, starredKey, s);
}

export async function deltaTweetStarredOnly(kv: KVNamespace, personId: string, delta: number): Promise<void> {
  const starredKey = personCountKey(personId, "tweets:starred");
  const s = (await readCount(kv, starredKey)) + delta;
  await writeCount(kv, starredKey, s);
}

export async function deletePersonCountKeys(kv: KVNamespace, personId: string): Promise<void> {
  await Promise.all(allPersonCountKeys(personId).map((k) => kv.delete(k)));
}

export async function initPersonCountKeysZero(kv: KVNamespace, personId: string): Promise<void> {
  await Promise.all(allPersonCountKeys(personId).map((k) => kv.put(k, "0")));
}

export type TweetsStarredFilter = "all" | "starred" | "unstarred";

export async function getListTotalFromKv(
  kv: KVNamespace,
  personId: string,
  kind: string,
  tweetsStarredFilter: TweetsStarredFilter,
): Promise<number> {
  if (kind !== "tweets") {
    return readCount(kv, personCountKey(personId, kind));
  }
  const total = await readCount(kv, personCountKey(personId, "tweets"));
  const starred = await readCount(kv, personCountKey(personId, "tweets:starred"));
  if (tweetsStarredFilter === "all") return total;
  if (tweetsStarredFilter === "starred") return starred;
  return Math.max(0, total - starred);
}

function countFromBatchRow(r: { results?: unknown[] }): number {
  return Number((r.results?.[0] as { n?: number } | undefined)?.n ?? 0);
}

/** 用 D1 聚合结果覆盖该人物在 KV 中的条目计数（管理端纠偏 / 首次对齐）。 */
export async function rebuildPersonCountsFromD1(db: D1Database, kv: KVNamespace, personId: string): Promise<void> {
  const [booksC, articlesC, videosC, podcastsC, tweetsC, answersC, tweetsStarredC] = await db.batch([
    db.prepare("SELECT COUNT(*) as n FROM books WHERE person_id = ?").bind(personId),
    db.prepare("SELECT COUNT(*) as n FROM articles WHERE person_id = ?").bind(personId),
    db.prepare("SELECT COUNT(*) as n FROM videos WHERE person_id = ?").bind(personId),
    db.prepare("SELECT COUNT(*) as n FROM podcasts WHERE person_id = ?").bind(personId),
    db.prepare("SELECT COUNT(*) as n FROM tweets WHERE person_id = ?").bind(personId),
    db.prepare("SELECT COUNT(*) as n FROM answers WHERE person_id = ?").bind(personId),
    db.prepare("SELECT COUNT(*) as n FROM tweets WHERE person_id = ? AND starred = 1").bind(personId),
  ]);

  await Promise.all([
    kv.put(personCountKey(personId, "books"), String(countFromBatchRow(booksC))),
    kv.put(personCountKey(personId, "articles"), String(countFromBatchRow(articlesC))),
    kv.put(personCountKey(personId, "videos"), String(countFromBatchRow(videosC))),
    kv.put(personCountKey(personId, "podcasts"), String(countFromBatchRow(podcastsC))),
    kv.put(personCountKey(personId, "tweets"), String(countFromBatchRow(tweetsC))),
    kv.put(personCountKey(personId, "answers"), String(countFromBatchRow(answersC))),
    kv.put(personCountKey(personId, "tweets:starred"), String(countFromBatchRow(tweetsStarredC))),
  ]);
}

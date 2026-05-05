import type { Env } from "../types";
import { tapD1Meta } from "./d1DevLog";

const PREFIX = "v1:ti";

export function tweetIndexKey(personId: string, starred?: boolean): string {
  return starred ? `${PREFIX}:${personId}:starred` : `${PREFIX}:${personId}`;
}

export function allTweetIndexKeys(personId: string): string[] {
  return [tweetIndexKey(personId), tweetIndexKey(personId, true)];
}

/**
 * Rebuild the KV tweet-ID index for a person.
 * Stores two sorted arrays: all tweet IDs and starred-only tweet IDs,
 * both ordered by (datetime DESC, id DESC).
 */
export async function rebuildTweetIndex(
  db: D1Database,
  kv: KVNamespace,
  personId: string,
  d1LogEnv: Pick<Env, "LOG_D1_META"> = {},
): Promise<void> {
  const { results } = await tapD1Meta(
    d1LogEnv,
    `rebuildTweetIndex(${personId})`,
    db
      .prepare(
        "SELECT id, starred FROM tweets WHERE person_id = ? ORDER BY datetime DESC, id DESC",
      )
      .bind(personId)
      .all<{ id: number; starred: number }>(),
  );

  const allIds: number[] = [];
  const starredIds: number[] = [];
  for (const r of results) {
    allIds.push(r.id);
    if (r.starred === 1) starredIds.push(r.id);
  }

  await Promise.all([
    kv.put(tweetIndexKey(personId), JSON.stringify(allIds)),
    kv.put(tweetIndexKey(personId, true), JSON.stringify(starredIds)),
  ]);
}

export interface TweetIdPage {
  ids: number[];
  totalCount: number;
  totalPages: number;
}

function parseIdArray(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return null;
    const ids = v.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    return ids;
  } catch {
    return null;
  }
}

/**
 * Read a page of tweet IDs from the KV index.
 * Returns empty page if the index doesn't exist yet.
 */
export async function fetchTweetIdPage(
  kv: KVNamespace,
  personId: string,
  page: number,
  pageSize: number,
  starred: boolean,
): Promise<TweetIdPage> {
  const raw = await kv.get(tweetIndexKey(personId, starred));
  if (!raw) return { ids: [], totalCount: 0, totalPages: 0 };

  const allIds: number[] = JSON.parse(raw);
  const totalCount = allIds.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * pageSize;
  const ids = allIds.slice(start, start + pageSize);

  return { ids, totalCount, totalPages };
}

/**
 * Incrementally update the starred-only ID index in KV, preserving the global
 * `(datetime DESC, id DESC)` order by using the ALL-ID index as the source of truth.
 *
 * Returns `true` if the KV update succeeded without needing a rebuild.
 * Returns `false` if KV is missing/inconsistent and caller should rebuild.
 */
export async function updateTweetStarredIndex(
  kv: KVNamespace,
  personId: string,
  tweetId: number,
  nextStarred: boolean,
): Promise<boolean> {
  const [rawAll, rawStarred] = await Promise.all([
    kv.get(tweetIndexKey(personId)),
    kv.get(tweetIndexKey(personId, true)),
  ]);
  const allIds = parseIdArray(rawAll);
  const starredIds = parseIdArray(rawStarred) ?? [];
  if (!allIds) return false;

  const posInAll = allIds.indexOf(tweetId);
  if (posInAll < 0) return false;

  const existsInStarred = starredIds.includes(tweetId);
  if (nextStarred) {
    if (existsInStarred) return true;

    // Insert tweetId into starredIds according to its order in allIds.
    // Find the nearest starred neighbor in allIds and insert before it.
    let insertAt = starredIds.length;
    for (let i = 0; i < starredIds.length; i++) {
      const sid = starredIds[i];
      const p = allIds.indexOf(sid);
      if (p < 0) return false; // inconsistent: starred id missing from all index
      if (p > posInAll) {
        insertAt = i;
        break;
      }
    }
    const next = [...starredIds.slice(0, insertAt), tweetId, ...starredIds.slice(insertAt)];
    await kv.put(tweetIndexKey(personId, true), JSON.stringify(next));
    return true;
  }

  if (!existsInStarred) return true;
  const next = starredIds.filter((id) => id !== tweetId);
  await kv.put(tweetIndexKey(personId, true), JSON.stringify(next));
  return true;
}

export async function deleteTweetIndexKeys(kv: KVNamespace, personId: string): Promise<void> {
  await Promise.all(allTweetIndexKeys(personId).map((k) => kv.delete(k)));
}

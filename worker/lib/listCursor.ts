import type { Env } from "../types";
import { tapD1First, tapD1Meta } from "./d1DevLog";

export type CursorDir = "next" | "prev";

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
}

export function parseCursorDir(raw: string | undefined): CursorDir {
  return raw === "prev" ? "prev" : "next";
}

/**
 * Cursor-based pagination for tables ordered by `id ASC`.
 */
export async function fetchCursorPageByIdAsc<T extends { id: number }>(
  env: Pick<Env, "DB" | "LOG_D1_META">,
  label: string,
  table: string,
  personId: string,
  cursor: string | null,
  dir: CursorDir,
  pageSize: number,
): Promise<CursorPage<T>> {
  const limit = pageSize + 1;
  let sql: string;
  let binds: unknown[];

  if (!cursor) {
    sql = `SELECT * FROM ${table} WHERE person_id = ? ORDER BY id ASC LIMIT ?`;
    binds = [personId, limit];
  } else {
    const cursorId = Number(cursor);
    if (dir === "next") {
      sql = `SELECT * FROM ${table} WHERE person_id = ? AND id > ? ORDER BY id ASC LIMIT ?`;
      binds = [personId, cursorId, limit];
    } else {
      sql = `SELECT * FROM ${table} WHERE person_id = ? AND id < ? ORDER BY id DESC LIMIT ?`;
      binds = [personId, cursorId, limit];
    }
  }

  const { results } = await tapD1Meta(
    env,
    label,
    env.DB.prepare(sql).bind(...binds).all<T>(),
  );

  return buildCursorPage([...results], cursor, dir, pageSize);
}

/**
 * Cursor-based pagination for tweets ordered by `datetime DESC, id DESC`.
 *
 * Cursor is a tweet `id`; the helper looks up its `datetime` to build
 * the compound `(datetime, id)` seek condition.
 *
 * Uses `datetime <= ?` / `datetime >= ?` as the primary range predicate so
 * SQLite can seek directly in the `(person_id, datetime DESC, id DESC)` index,
 * then applies `(datetime < ? OR id < ?)` as a residual filter to exclude
 * the cursor row itself.
 */
export async function fetchTweetsCursorPage<T extends { id: number; datetime: string | null }>(
  env: Pick<Env, "DB" | "LOG_D1_META">,
  label: string,
  personId: string,
  cursor: string | null,
  dir: CursorDir,
  pageSize: number,
  extraWhere: string = "",
): Promise<CursorPage<T>> {
  const limit = pageSize + 1;
  let sql: string;
  let binds: unknown[];

  if (!cursor) {
    sql = `SELECT * FROM tweets WHERE person_id = ?${extraWhere} ORDER BY datetime DESC, id DESC LIMIT ?`;
    binds = [personId, limit];
  } else {
    const cursorId = Number(cursor);
    const cursorRow = await tapD1First<{ datetime: string | null }>(
      env,
      `${label}: cursor lookup`,
      env.DB.prepare("SELECT datetime FROM tweets WHERE id = ?").bind(cursorId),
    );
    if (!cursorRow) {
      return fetchTweetsCursorPage(env, label, personId, null, "next", pageSize, extraWhere);
    }

    const dt = cursorRow.datetime;

    if (dt !== null) {
      if (dir === "next") {
        sql = `SELECT * FROM tweets WHERE person_id = ? AND datetime <= ? AND (datetime < ? OR id < ?)${extraWhere} ORDER BY datetime DESC, id DESC LIMIT ?`;
        binds = [personId, dt, dt, cursorId, limit];
      } else {
        sql = `SELECT * FROM tweets WHERE person_id = ? AND datetime >= ? AND (datetime > ? OR id > ?)${extraWhere} ORDER BY datetime ASC, id ASC LIMIT ?`;
        binds = [personId, dt, dt, cursorId, limit];
      }
    } else {
      if (dir === "next") {
        sql = `SELECT * FROM tweets WHERE person_id = ? AND datetime IS NULL AND id < ?${extraWhere} ORDER BY datetime DESC, id DESC LIMIT ?`;
        binds = [personId, cursorId, limit];
      } else {
        sql = `SELECT * FROM tweets WHERE person_id = ? AND (datetime IS NOT NULL OR (datetime IS NULL AND id > ?))${extraWhere} ORDER BY datetime ASC, id ASC LIMIT ?`;
        binds = [personId, cursorId, limit];
      }
    }
  }

  const { results } = await tapD1Meta(
    env,
    label,
    env.DB.prepare(sql).bind(...binds).all<T>(),
  );

  return buildCursorPage([...results], cursor, dir, pageSize);
}

function buildCursorPage<T extends { id: number }>(
  rows: T[],
  cursor: string | null,
  dir: CursorDir,
  pageSize: number,
): CursorPage<T> {
  const hasMore = rows.length > pageSize;
  if (hasMore) rows = rows.slice(0, pageSize);
  if (dir === "prev") rows.reverse();

  let nextCursor: string | null = null;
  let prevCursor: string | null = null;

  if (rows.length > 0) {
    if (!cursor) {
      nextCursor = hasMore ? String(rows[rows.length - 1].id) : null;
    } else if (dir === "next") {
      nextCursor = hasMore ? String(rows[rows.length - 1].id) : null;
      prevCursor = String(rows[0].id);
    } else {
      prevCursor = hasMore ? String(rows[0].id) : null;
      nextCursor = String(rows[rows.length - 1].id);
    }
  }

  return { items: rows, nextCursor, prevCursor };
}

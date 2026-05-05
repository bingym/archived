import type { Env } from "../types";
import { tapD1Meta } from "./d1DevLog";

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

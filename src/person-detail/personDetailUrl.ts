import type { TabKey } from "./types";

const VALID_TAB_SEGMENTS = new Set<string>([
  "info",
  "books",
  "articles",
  "videos",
  "podcasts",
  "twitter",
  "answers",
]);

/** 路径段是否为合法 TAB */
export function parsePersonDetailTabParam(tab: string | undefined): TabKey | null {
  if (!tab || !VALID_TAB_SEGMENTS.has(tab)) return null;
  return tab as TabKey;
}

/** 解析 URL 查询中的页码，非法或缺失时返回 1 */
export function parsePersonDetailPage(searchParams: URLSearchParams): number {
  const raw = searchParams.get("page");
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/**
 * 生成详情页路径。
 * - Info 不带 page。
 * - 其他 TAB：仅当 page > 1 时附加 `?page=`（page=1 时省略，便于分享默认首页）。
 */
export function buildPersonDetailPath(id: string, tab: TabKey, page: number = 1): string {
  const path = `/people/${id}/${tab}`;
  if (tab === "info" || page <= 1) return path;
  return `${path}?page=${page}`;
}

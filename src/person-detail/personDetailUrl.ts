import type { TabKey } from "./types";

/** Tweets 列表：按星标筛选（同步到 URL `starred` 查询参数） */
export type TweetsStarredFilter = "all" | "starred" | "unstarred";

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

export function parseTweetsStarredFilter(searchParams: URLSearchParams): TweetsStarredFilter {
  const s = searchParams.get("starred");
  if (s === "1" || s === "true") return "starred";
  if (s === "0" || s === "false") return "unstarred";
  return "all";
}

/**
 * 生成详情页路径。
 * - Info 不带 page。
 * - 其他 TAB：仅当 page > 1 时附加 `?page=`（page=1 时省略，便于分享默认首页）。
 * - Tweets：`starred=1` / `starred=0` 与 page 合并为同一查询串。
 */
export function buildPersonDetailPath(
  id: string,
  tab: TabKey,
  page: number = 1,
  options?: { tweetsStarred?: TweetsStarredFilter }
): string {
  const path = `/people/${id}/${tab}`;
  const params = new URLSearchParams();
  if (tab !== "info" && page > 1) {
    params.set("page", String(page));
  }
  if (tab === "twitter" && options?.tweetsStarred && options.tweetsStarred !== "all") {
    params.set("starred", options.tweetsStarred === "starred" ? "1" : "0");
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

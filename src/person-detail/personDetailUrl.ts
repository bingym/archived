import { DEFAULT_ITEM_PAGE_SIZE, normalizeItemPageSize, type ItemPageSize } from "./constants";
import type { TabKey } from "./types";

/** Tweets 列表：仅支持「全部 / 仅星标」；URL 用 `starred=1` 表示仅星标。 */
export type TweetsStarredFilter = "all" | "starred";

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

/** 解析 URL 中的 `pageSize`，仅允许 10 / 20 / 50，缺省为默认 */
export function parsePersonDetailPageSize(searchParams: URLSearchParams): ItemPageSize {
  return normalizeItemPageSize(searchParams.get("pageSize"));
}

export function parseTweetsStarredFilter(searchParams: URLSearchParams): TweetsStarredFilter {
  const s = searchParams.get("starred");
  if (s === "1" || s === "true") return "starred";
  return "all";
}

/**
 * 生成详情页路径。
 * - Info 不带查询参数。
 * - Tweets：仅 `starred=1`（仅星标）时附加。
 * - 非默认 `pageSize`（≠ 默认值）时附加 `pageSize=`。
 */
export function buildPersonDetailPath(
  id: string,
  tab: TabKey,
  options?: { tweetsStarred?: TweetsStarredFilter; pageSize?: ItemPageSize }
): string {
  const path = `/people/${id}/${tab}`;
  const params = new URLSearchParams();
  if (tab === "twitter" && options?.tweetsStarred === "starred") {
    params.set("starred", "1");
  }
  const ps = options?.pageSize;
  if (tab !== "info" && ps !== undefined && ps !== DEFAULT_ITEM_PAGE_SIZE) {
    params.set("pageSize", String(ps));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

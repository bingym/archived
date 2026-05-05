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

/** Tweets 列表的 `page` 查询参数，从 1 起；非法或缺省为 1 */
export function parsePersonDetailTweetPage(searchParams: URLSearchParams): number {
  const raw = searchParams.get("page");
  if (raw == null || raw === "") return 1;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function parseTweetsStarredFilter(searchParams: URLSearchParams): TweetsStarredFilter {
  const s = searchParams.get("starred");
  if (s === "1" || s === "true") return "starred";
  return "all";
}

export interface BuildPersonDetailPathOptions {
  tweetsStarred?: TweetsStarredFilter;
  pageSize?: ItemPageSize;
  /** 仅 `twitter` tab：页码分页，从 1 起 */
  page?: number;
}

/**
 * 生成详情页路径。
 * - Info 不带查询参数。
 * - Tweets：始终附加 `pageSize` 与 `page`，便于分享链接直达某一页；仅星标时附加 `starred=1`。
 * - 其他条目 tab：非默认 `pageSize` 时附加 `pageSize=`。
 */
export function buildPersonDetailPath(
  id: string,
  tab: TabKey,
  options?: BuildPersonDetailPathOptions,
): string {
  const path = `/people/${id}/${tab}`;
  const params = new URLSearchParams();

  if (tab === "twitter") {
    const ps = options?.pageSize ?? DEFAULT_ITEM_PAGE_SIZE;
    params.set("pageSize", String(ps));
    const p = options?.page ?? 1;
    params.set("page", String(Math.max(1, Math.floor(p))));
    if (options?.tweetsStarred === "starred") {
      params.set("starred", "1");
    }
  } else if (tab !== "info") {
    const ps = options?.pageSize;
    if (ps !== undefined && ps !== DEFAULT_ITEM_PAGE_SIZE) {
      params.set("pageSize", String(ps));
    }
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

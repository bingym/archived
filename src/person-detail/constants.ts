import type { ItemKind } from "../components/ItemEditor";
import type { TabKey } from "./types";

/** 人物详情条目列表默认每页条数（与 worker `GET /people/:id/:kind` 默认一致） */
export const DEFAULT_ITEM_PAGE_SIZE = 20;

export const ITEM_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type ItemPageSize = (typeof ITEM_PAGE_SIZE_OPTIONS)[number];

export function normalizeItemPageSize(value: unknown): ItemPageSize {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (n === 10 || n === 20 || n === 50) return n;
  return DEFAULT_ITEM_PAGE_SIZE;
}

export const TAB_TO_KIND: Partial<Record<TabKey, ItemKind>> = {
  books: "books",
  articles: "articles",
  videos: "videos",
  podcasts: "podcasts",
  twitter: "tweets",
  answers: "answers",
};

/** TAB key → `GET .../people/:id/:kind` 中的 `kind` 路径段 */
export function tabToItemsKind(tab: TabKey): string | null {
  switch (tab) {
    case "books":
      return "books";
    case "articles":
      return "articles";
    case "videos":
      return "videos";
    case "podcasts":
      return "podcasts";
    case "twitter":
      return "tweets";
    case "answers":
      return "answers";
    default:
      return null;
  }
}

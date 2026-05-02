import type { ItemKind } from "../components/ItemEditor";
import type { TabKey } from "./types";

export const PAGE_SIZE = 50;

export const TAB_TO_KIND: Partial<Record<TabKey, ItemKind>> = {
  books: "books",
  articles: "articles",
  videos: "videos",
  podcasts: "podcasts",
  twitter: "tweets",
  answers: "answers",
};

/** TAB key → `GET .../items/:kind` 路径段 */
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

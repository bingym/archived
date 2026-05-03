export interface BaseItem {
  id: number;
}
export interface BookItem extends BaseItem {
  title: string;
  url: string | null;
  cover: string | null;
}
export interface ArticleItem extends BaseItem {
  title: string;
  content: string | null;
}
export interface VideoItem extends BaseItem {
  title: string;
  url: string | null;
}
export interface PodcastItem extends BaseItem {
  title: string;
  url: string | null;
}
export interface TweetItem extends BaseItem {
  datetime: string | null;
  content: string | null;
  imgs: string[];
  starred: boolean;
}
export interface AnswerItem extends BaseItem {
  datetime: string | null;
  question: string | null;
  content: string | null;
}

export interface PersonCounts {
  books: number;
  articles: number;
  videos: number;
  podcasts: number;
  tweets: number;
  answers: number;
}

export interface PersonSummary {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  counts: PersonCounts;
}

export type TabKey = "info" | "books" | "articles" | "videos" | "podcasts" | "twitter" | "answers";

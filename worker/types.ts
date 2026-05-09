export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  ADMIN_TOKEN: string;
  /** 设为 `1` / `true` 时在控制台打印 D1 的 `meta`（rows_read、rows_written 等）；建议仅写在 `.dev.vars`。 */
  LOG_D1_META?: string;
}

export interface Person {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
  /** SQLite 0/1：是否对未登录访客可见 */
  visible: number;
  created_at: number;
  updated_at: number;
}

export interface Book {
  id: number;
  person_id: string;
  title: string;
  url: string | null;
  cover: string | null;
  created_at: number;
  updated_at: number;
}

export interface Article {
  id: number;
  person_id: string;
  title: string;
  content: string | null;
  created_at: number;
  updated_at: number;
}

export interface Video {
  id: number;
  person_id: string;
  title: string;
  url: string | null;
  created_at: number;
  updated_at: number;
}

export interface Podcast {
  id: number;
  person_id: string;
  title: string;
  url: string | null;
  created_at: number;
  updated_at: number;
}

export interface TweetRow {
  id: number;
  person_id: string;
  datetime: string | null;
  content: string | null;
  metadata: string | null;
  imgs: string | null;
  /** SQLite 0/1 */
  starred: number;
  created_at: number;
  updated_at: number;
}

export interface Tweet {
  id: number;
  person_id: string;
  datetime: string | null;
  content: string | null;
  metadata: string | null;
  imgs: string[];
  starred: boolean;
  created_at: number;
  updated_at: number;
}

export interface Answer {
  id: number;
  person_id: string;
  datetime: string | null;
  question: string | null;
  content: string | null;
  created_at: number;
  updated_at: number;
}

export type ItemKind = "books" | "articles" | "videos" | "podcasts" | "tweets" | "answers";
export type UploadPrefix = "avatars" | "covers" | "tweets" | "answers";

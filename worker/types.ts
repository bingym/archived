export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  ADMIN_TOKEN: string;
}

export interface Person {
  id: string;
  name: string;
  avatar: string | null;
  description: string | null;
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

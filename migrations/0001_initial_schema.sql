-- Migration number: 0001
-- Initial schema: people + per-type item tables (no FK / no CHECK / no enums).

-- People (root entities). Person id is a human-readable slug like "elonmusk".
CREATE TABLE IF NOT EXISTS people (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  avatar       TEXT,
  description  TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

-- Books authored / recommended for the person.
CREATE TABLE IF NOT EXISTS books (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  cover        TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_books_person ON books(person_id);

-- Long-form articles or essays attributed to the person.
CREATE TABLE IF NOT EXISTS articles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_articles_person ON articles(person_id);

-- Videos (talks, interviews, etc).
CREATE TABLE IF NOT EXISTS videos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_videos_person ON videos(person_id);

-- Podcasts.
CREATE TABLE IF NOT EXISTS podcasts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_podcasts_person ON podcasts(person_id);

-- Tweets / micro-blog posts. `imgs` is a JSON-encoded array of R2 object keys.
CREATE TABLE IF NOT EXISTS tweets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id    TEXT NOT NULL,
  datetime     TEXT,
  content      TEXT,
  metadata     TEXT,
  imgs         TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tweets_person ON tweets(person_id);

-- Q&A entries (Quora / Zhihu style).
CREATE TABLE IF NOT EXISTS answers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id    TEXT NOT NULL,
  datetime     TEXT,
  question     TEXT,
  content      TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_person ON answers(person_id);

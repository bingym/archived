-- Migration number: 0004
-- 「只看星标」列表：WHERE starred = 1 + ORDER BY datetime DESC, id DESC 可走索引，避免扫该人全部推文。
-- 与 0003 的 idx_tweets_person_datetime_id 并列；星标列表用本 partial index。
-- 0002 的 idx_tweets_person_starred (person_id, starred) 在只支持星标=true 筛选后由本索引替代，故删除。

DROP INDEX IF EXISTS idx_tweets_person_starred;
CREATE INDEX IF NOT EXISTS idx_tweets_starred_person_datetime_id
  ON tweets(person_id, datetime DESC, id DESC)
  WHERE starred = 1;

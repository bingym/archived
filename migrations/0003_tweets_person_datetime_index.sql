-- Migration number: 0003
-- Tweets 列表固定按 datetime 排序：用 (person_id, datetime, id) 复合索引替代仅 person_id，
-- 减少 D1 read rows（避免先按 person_id 大范围扫描再排序）。

DROP INDEX IF EXISTS idx_tweets_person;
CREATE INDEX IF NOT EXISTS idx_tweets_person_datetime_id ON tweets(person_id, datetime DESC, id DESC);

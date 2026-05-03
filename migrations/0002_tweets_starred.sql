-- Migration number: 0002
-- Tweets: optional star flag (0/1) for highlighting entries.

ALTER TABLE tweets ADD COLUMN starred INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tweets_person_starred ON tweets(person_id, starred);

-- Migration number: 0005
-- cursor 分页（WHERE person_id = ? AND id > / < ?）需要 (person_id, id) 复合索引
-- 以避免扫描该 person 的全部行。tweets 已有 0003 的复合索引，不需要额外处理。

DROP INDEX IF EXISTS idx_books_person;
CREATE INDEX IF NOT EXISTS idx_books_person_id ON books(person_id, id);

DROP INDEX IF EXISTS idx_articles_person;
CREATE INDEX IF NOT EXISTS idx_articles_person_id ON articles(person_id, id);

DROP INDEX IF EXISTS idx_videos_person;
CREATE INDEX IF NOT EXISTS idx_videos_person_id ON videos(person_id, id);

DROP INDEX IF EXISTS idx_podcasts_person;
CREATE INDEX IF NOT EXISTS idx_podcasts_person_id ON podcasts(person_id, id);

DROP INDEX IF EXISTS idx_answers_person;
CREATE INDEX IF NOT EXISTS idx_answers_person_id ON answers(person_id, id);

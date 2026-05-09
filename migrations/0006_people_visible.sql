-- Migration number: 0006
-- 增加 people.visible（0/1）控制未登录访客是否可见。默认 1（公开）。
-- 未登录访客：列表与详情仅返回 visible = 1；登录的管理员可见全部并可编辑。

ALTER TABLE people ADD COLUMN visible INTEGER NOT NULL DEFAULT 1;

-- 仅过滤公开人物列表的部分索引（visible = 1）
CREATE INDEX IF NOT EXISTS idx_people_visible_id ON people(id) WHERE visible = 1;

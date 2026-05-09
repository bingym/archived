# 数据、迁移与导入脚本

## 数据存储分层

- **D1**：运行期业务数据（people + items）
- **R2**：图片对象（头像/封面/推文图），D1 里存 object key 或外链 URL
- **KV**：派生数据（counts / tweets 分页索引），可重建

仓库中的 `data/` 主要作为原始 JSON/CSV 参考；真正运行期数据不在 git 中。

## 数据库迁移（migrations）

所有表结构变更必须通过 `migrations/*.sql`，不要修改历史 migration。

当前迁移文件：

- `0001_initial_schema.sql`：创建 `people` 与各 item 表
- `0002_tweets_starred.sql`：tweets 增加 `starred`（0/1）
- `0003_tweets_person_datetime_index.sql`：tweets 排序索引改为 `(person_id, datetime DESC, id DESC)`
- `0004_tweets_starred_partial_index.sql`：星标列表使用 partial index（`WHERE starred = 1`）
- `0005_item_list_person_id_index.sql`：为 cursor 分页优化 items 索引为 `(person_id, id)`（tweets 已在 0003 覆盖）
- `0006_people_visible.sql`：people 增加 `visible`（0/1，默认 1），并加 `visible = 1` 的部分索引；未登录访客只能看到 `visible = 1` 的人物

应用迁移：

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

## 导入脚本（scripts）

脚本普遍遵循这些约定：

- 生成的 SQL 默认写到 `scripts/generated/*.sql`
- 生成 SQL 后用 `wrangler d1 execute archived --local|--remote --file=...` 应用到 D1
- 涉及图片的脚本会把图片上传到 R2，并在 tweets 的 `imgs` 字段写入 **JSON 字符串数组**（数组元素为 R2 object key）

### 1) 导入 CSV（gzallen）

- 脚本：`scripts/import-gzallen-twitter.mjs`
- 输入：`data/gzallen/twitter.csv`
- 输出：`scripts/generated/gzallen_tweets.sql`
- 行为：可选先 `DELETE FROM tweets WHERE person_id='gzallen'` 再插入

运行：

```bash
npm run import:gzallen-tweets
```

### 2) 导入微博 JSON（zym）

- 脚本：`scripts/import-zym-tweets.mjs`
- 输入：`data/zym/2886.json`（可用 `--json` 指向任意路径）
- 输出：`scripts/generated/zym_tweets.sql`
- 行为：只写 D1（不上传图片，`imgs = NULL`）

运行：

```bash
npm run import:zym-tweets
```

### 3) 导入微博 JSON + 上传图片（wangxing）

- 脚本：`scripts/import-wangxing-tweets.mjs`
- 输入：`data/wangxing/wangxing.json`（通常较大，推荐 `--json /path/to/file`）
- 输出：`scripts/generated/wangxing_tweets.sql`
- 图片：默认从 JSON 内的 base64 解码 → `sharp` 转 PNG → `wrangler r2 object put` 上传
- 远端上传：加 `--remote`（需要 `wrangler login`）
- 仅生成 SQL：加 `--no-upload`（`imgs = NULL`）

运行：

```bash
npm run import:wangxing-tweets
```

### 4) 补传单张 wangxing 图片到 R2

用于修复导入中某一张图片上传失败的情况：

- 脚本：`scripts/r2-put-wangxing-one.mjs`
- 用法 1：从 JSON 中按 `index` 定位并上传 `imgs[n]`
- 用法 2：已有 PNG 直接按 key 上传

### 5) 规范化 datetime 文本（非常重要）

`tweets` / `answers` 的 `datetime` 是 `TEXT`，列表排序依赖字符串可比较。若存在 `2015-9-24` 这种不补零格式，会导致排序错误。

- 脚本：`scripts/normalize-datetime-text.mjs`
- 默认本地：`--local`（可加 `--remote`）
- 建议先 dry-run：`--dry-run`
- 输出：会生成分块 SQL 到 `scripts/generated/normalize_datetime_patch/`

运行：

```bash
npm run db:normalize-datetime:dry
npm run db:normalize-datetime
```



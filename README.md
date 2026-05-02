# Archived

人物资料展示站点：React（Vite）前端 + Cloudflare Workers（Hono）API + D1 数据库 + R2 图片存储。

## 本地开发

1. 安装依赖：`npm install`
2. 应用 D1 **migrations**（建表等；第 1 个文件为 [`migrations/0001_initial_schema.sql`](migrations/0001_initial_schema.sql)）：

```bash
npm run db:migrate:local
```

3. 新增后续 migration：在 [`migrations/`](migrations/) 下按顺序加 `0002_xxx.sql`、`0003_xxx.sql`，或执行：

```bash
npx wrangler d1 migrations create archived "你的变更说明"
```

编辑生成文件中的 SQL 后，再执行 `npm run db:migrate:local`（或 remote）应用。

4. 数据需自行灌入 D1（脚本或 `wrangler d1 execute` 等）。仓库里的 `data/` 仅作原始 JSON/CSV 参考。

5. 在项目根目录创建 `.dev.vars`（仅本地 `wrangler dev` 使用）：

```
ADMIN_TOKEN=你的随机密钥
```

6. 开两个终端：

- 终端 A：`npm run dev`（Vite，默认 `http://localhost:5178`，会把 `/api` 与 `/r2` 代理到 8787）
- 终端 B：`npm run dev:worker`（Wrangler，默认 `http://localhost:8787`）

浏览器打开 Vite 地址即可。登录后右上角输入与 `.dev.vars` 相同的 `ADMIN_TOKEN` 可解锁编辑与上传。

## 部署到 Cloudflare

1. `npx wrangler login`
2. `npm run db:create`，把输出的 `database_id` 填进 [`wrangler.toml`](wrangler.toml) 里 `[[d1_databases]]` 的 `database_id`。
3. `npm run r2:create`（若 bucket 已存在可跳过）。
4. `npx wrangler secret put ADMIN_TOKEN`，设置与前端登录时一致的密钥。
5. 远端应用 migrations：

```bash
npm run db:migrate:remote
```

6. 自行迁移业务数据后，`npm run deploy`（先 `vite build` 再发布 Worker + Assets）。

## 数据说明

- 运行期数据在 **D1**；表结构演进只通过 `migrations/` 下的 SQL 文件（由 Wrangler 记录已执行版本）。
- 头像、书籍封面、推文配图上传到 **R2**，数据库里存 object key；外链 URL 仍可直链显示（前端 `resolveImg` 会识别 `http(s)://`）。

## API 摘要

- `GET /api/v1/people` — 列表
- `GET /api/v1/people/:id` — 详情（含 `books` / `articles` / `videos` / `podcasts` / `twitter` / `answers`）
- 写操作均需 `Authorization: Bearer <ADMIN_TOKEN>`
- `POST /api/v1/uploads?prefix=avatars|covers|tweets` — 上传图片（raw body，`Content-Type: image/*`）
- `DELETE /api/v1/uploads/<key>` — 删除 R2 对象
- `GET /r2/<key>` — 公开读取图片

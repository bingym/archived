# 架构与代码地图

## 系统概览

本项目由三部分组成：

- **前端**：`Vite + React`（`src/`），负责页面渲染、编辑表单、上传入口。
- **后端**：`Cloudflare Workers + Hono`（`worker/`），提供 REST API、鉴权、D1/R2/KV 读写。
- **存储**：
  - **D1**：业务数据（people + items：books/articles/videos/podcasts/tweets/answers）
  - **R2**：图片对象（头像/封面/推文图等），数据库里存 object key 或外链 URL
  - **KV**：每人条目计数与 tweets 的分页索引（提高读取性能）

静态资源通过 `wrangler.toml` 的 `[assets] directory = "./dist"` 由 Worker 承载，并开启 SPA fallback（`not_found_handling = "single-page-application"`）。

## 请求路径与路由挂载

Worker 在 `worker/index.ts` 挂载如下路由：

- `/api/v1/people/*` → `worker/routes/people.ts`
- `/api/v1/*` → `worker/routes/items.ts`（通用 items CRUD）
- `/api/v1/uploads/*` → `worker/routes/r2.ts`（上传/删除）
- `/r2/*` → `worker/routes/r2.ts`（公开读取图片）

## 数据模型（D1）

真实 schema 以 `migrations/` 为准（见 `docs/data.md`）。核心表：

- `people`：人物根实体（`id` 为 slug）
- `books / articles / videos / podcasts / tweets / answers`：按 `person_id` 关联的条目表

## 鉴权模型

- 只有一种“管理员 token”鉴权：`Authorization: Bearer <ADMIN_TOKEN>`
- Worker 使用 `worker/middleware/auth.ts` 的 `requireAdmin` 中间件保护写操作
- 前端将 token 存在 `localStorage`（key：`archived.adminToken`），请求由 `src/auth.ts` 自动注入 header

## 计数与索引（KV）

### 每人条目计数

`GET /api/v1/people/:id` 返回 `counts`，来自 KV（见 `worker/lib/personItemCounts.ts`）。

写操作在 `worker/routes/items.ts` 与 `worker/routes/people.ts` 中对 KV 做增量更新；如 KV 丢失/不一致，可调用：

- `POST /api/v1/people/:id/rebuild-counts`（需要管理员 token）

### tweets 分页/星标索引

tweets 列表在 `worker/routes/people.ts` 中通过 KV 索引分页读取（见 `worker/lib/tweetIndex.ts`），并支持：

- `GET /api/v1/people/:id/tweets?page=1&pageSize=20`
- `GET /api/v1/people/:id/tweets?starred=1&page=1&pageSize=20`

当 `datetime` 变更会触发重建；当仅 `starred` 切换通常走增量更新（必要时回退重建）。

## 图片处理与清理策略

- 数据库字段可存外链 URL 或 R2 object key
- Worker 用“是否是 `http(s)://`”判断是否为 R2 key（`worker/lib/r2.ts`）
- 更新/删除条目时会清理旧 R2 key：
  - people：`avatar` 变更会删除旧头像（若为 R2 key）
  - books：`cover` 变更会删除旧封面（若为 R2 key）
  - tweets：删除时会遍历 `imgs` JSON 数组并删除其中的 R2 keys


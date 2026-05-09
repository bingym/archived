# 本仓库的 AI Agent 指南（必读）

本项目是一个人物资料展示站点：**Vite + React 前端** + **Cloudflare Workers（Hono）API** + **D1 数据库** + **R2 图片存储**（静态资产由 Worker `[assets]` 承载，SPA 路由）。

这份文件面向在仓库内工作的智能体/自动化（也适合人类贡献者），目标是让你在**不误改/不泄露 secrets** 的前提下，最快完成常见改动。

## TL;DR（最常用命令）

- **安装依赖**：`npm install`
- **本地跑起来（两个终端）**：
  - `npm run dev`（前端 Vite：`http://localhost:5178`，代理 `/api` `/r2` 到 8787）
  - `npm run dev:worker`（后端 Wrangler：`http://localhost:8787`）
- **本地迁移 D1**：`npm run db:migrate:local`
- **构建**：`npm run build`
- **发布（先 build 再 deploy）**：`npm run deploy`
- **Lint**：`npm run lint`

## 你应该先读的文档

- `README.md`：端到端本地开发与 Cloudflare 部署
- `docs/architecture.md`：目录结构、核心数据流、关键模块边界
- `docs/dev.md`：本地开发/调试/排障（含 `.dev.vars`、D1 meta 日志）
- `docs/data.md`：数据/迁移/导入脚本（`migrations/` + `scripts/`）
- `docs/api.md`：API 约定与鉴权、上传与清理策略

## 仓库结构（高频入口）

- `src/`：前端 React（人物详情页、编辑器、上传组件等）
- `worker/`：Cloudflare Worker（Hono 路由、D1/R2/KV 逻辑）
  - `worker/index.ts`：路由挂载（`/api/v1/people`、`/api/v1` items、`/api/v1/uploads`、`/r2`）
  - `worker/middleware/auth.ts`：`Authorization: Bearer <ADMIN_TOKEN>` 鉴权
  - `worker/routes/people.ts`：people CRUD + 详情 counts + 条目分页 + rebuild counts
  - `worker/routes/items.ts`：books/articles/videos/podcasts/tweets/answers 通用 CRUD（由 `SPECS` 驱动）
  - `worker/routes/r2.ts`：上传/删除 + 公共读取 `/r2/<key>`
  - `worker/lib/personItemCounts.ts`：每人各类条目数量缓存（KV）
  - `worker/lib/tweetIndex.ts`：tweets 分页/星标列表索引（KV）
- `migrations/`：D1 schema 演进（**只能**通过迁移文件改表/索引）
- `scripts/`：数据导入/修复脚本（生成 SQL、可选上传 R2）

## 运行与配置（本地 / 线上）

- **本地**：在仓库根目录创建 `.dev.vars`（不要提交）：
  - `ADMIN_TOKEN=...`（前端登录用同一个 token）
  - 可选：`LOG_D1_META=1` 打印 D1 查询 meta（rows_read / rows_written 等）
- **线上**：用 `wrangler secret put ADMIN_TOKEN` 设置同名 secret（不要写进 `wrangler.toml` 或仓库文件）
- 资源绑定见 `wrangler.toml`：
  - `DB`（D1）
  - `R2`（R2 bucket）
  - `KV`（KV namespace）

## 关键约定（避免踩坑）

- **写接口一律需要管理员鉴权**：Worker 侧用 `requireAdmin`；前端请求由 `src/auth.ts` 自动注入 `Authorization`。
- **图片字段存的不是 URL 就是 R2 key**：判定规则是“不是 http(s):// 就当作 R2 key”。更新/删除时会清理旧 key（避免 R2 泄漏）。
- **tweets 的排序依赖 `datetime` 文本可比较**：若导入源的时间格式不补零，会导致 `ORDER BY datetime DESC` 出错；用 `npm run db:normalize-datetime` 修复。
- **counts / tweets 索引在 KV**：写入会增量维护；如发现不一致，可对单人调用 `POST /api/v1/people/:id/rebuild-counts` 重建。

## 变更指南（Agent 工作方式）

- **改代码前先定位事实来源**：
  - API 行为以 `worker/routes/*.ts` 为准（不要只改前端）
  - 表结构以 `migrations/*.sql` 为准（不要在脚本里“假设字段存在”）
- **新增/修改 DB 结构**：
  - 只允许新增 migration（不要改历史 migration，避免远端环境分叉）
  - 迁移后同步更新：相关 API、前端 types、导入脚本（如受影响）
- **新增路由/绑定**：
  - 路由统一在 `worker/index.ts` 挂载
  - 新 env 绑定（D1/R2/KV/vars）要同步 `worker/types.ts` 的 `Env`
- **不要提交敏感信息**：
  - 禁止提交：`.dev.vars`、任何 token/密钥、导出的私有数据

## 当你需要写文档

如果内容超过本文件的“索引级别”，请写入 `docs/`，并在此处补链接。文档应以“可执行步骤 + 可验证结果”为中心，避免只写背景介绍。

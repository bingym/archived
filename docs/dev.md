# 本地开发与调试

## 前置要求

- Node.js（与 `package.json` 兼容的版本即可）
- 已安装依赖：`npm install`
- Cloudflare Wrangler（项目依赖已包含，推荐用 `npx wrangler ...`）

## 本地启动（推荐方式）

需要两个终端：

1. **启动前端（Vite）**

```bash
npm run dev
```

默认监听 `http://localhost:5178`，并把 `/api` 与 `/r2` 代理到 Worker（8787）。

2. **启动后端（Wrangler）**

```bash
npm run dev:worker
```

默认监听 `http://localhost:8787`。

## 本地环境变量（`.dev.vars`）

`.dev.vars` 仅被 `wrangler dev` 在本地读取，**不要提交到仓库**。可以从 `.dev.vars.example` 复制。

最少需要：

```
ADMIN_TOKEN=change-me
```

可选调试开关：

```
LOG_D1_META=1
```

当 `LOG_D1_META` 启用时，Worker 会在控制台打印每次 D1 查询的 meta（rows_read / rows_written 等），帮助排查索引缺失导致的扫描。

## D1 migrations（本地）

应用 migrations：

```bash
npm run db:migrate:local
```

新增 migration（会在 `migrations/` 下生成新文件）：

```bash
npx wrangler d1 migrations create archived "你的变更说明"
```

编辑生成的 SQL 后，再运行 `npm run db:migrate:local` 应用。

## 常见问题排查

### 1) 前端能开但 API 404/网络错误

- 确认 `npm run dev:worker` 正在运行（8787）
- 确认 `vite.config.ts` 的 proxy 指向 `http://localhost:8787`
- 访问 `GET http://localhost:8787/api/v1/people` 看 Worker 是否返回 JSON

### 2) 写操作 401 Unauthorized

- 需要 `Authorization: Bearer <ADMIN_TOKEN>`
- 前端登录 token 存在 `localStorage`（key：`archived.adminToken`）
- 确认 `.dev.vars` 内 `ADMIN_TOKEN` 已设置且与前端输入一致

### 3) tweets 排序不对

如果导入的 `datetime` 文本不补零（如 `2015-9-24`），会导致字符串排序不等于时间排序。

运行修复脚本（建议先 dry-run）：

```bash
npm run db:normalize-datetime:dry
npm run db:normalize-datetime
```

### 4) counts / tweets 列表数量不对

counts 与 tweets 分页索引在 KV 内，可能因开发时手动改库/导入绕过 API 导致不一致。

对单个人重建（需要管理员 token）：

```bash
curl -X POST "http://localhost:8787/api/v1/people/<personId>/rebuild-counts" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```


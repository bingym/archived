# API 约定与鉴权

## Base URL

- 本地 Worker：`http://localhost:8787`
- 前端开发服务器：`http://localhost:5178`（会代理 `/api` 与 `/r2` 到 8787）

## 鉴权（写操作）

所有写操作都要求 header：

```
Authorization: Bearer <ADMIN_TOKEN>
```

Worker 侧鉴权实现：`worker/middleware/auth.ts` 的 `requireAdmin`。

## People API

由 `worker/routes/people.ts` 实现。

- `GET /api/v1/people`
  - 未登录：仅返回 `visible = 1` 的人物（字段：`id/name/avatar/description`）
  - 已登录（携带 `Authorization: Bearer <ADMIN_TOKEN>`）：返回全部，并附带 `visible: boolean`
- `GET /api/v1/people/:id`
  - 未登录访问 `visible = 0` 的人物会得到 `404`（语义上"不存在"）
  - 已登录会返回 `visible: boolean`
  - 返回人物基本信息 + `counts`（counts 来自 KV）
- `POST /api/v1/people`（鉴权）
  - 创建人物（`id` 与 `name` 必填）
  - 可选 `visible: boolean`（默认 `true`）
- `PUT /api/v1/people/:id`（鉴权）
  - 更新人物字段；若 `avatar` 发生变更且旧值是 R2 key，会清理旧对象
  - 可选 `visible: boolean` 控制对未登录访客的可见性
- `DELETE /api/v1/people/:id`（鉴权）
  - 级联删除该人物所有 items + 清理 KV keys + 清理相关 R2 对象（头像/封面/推文图）

### 条目分页读取

- `GET /api/v1/people/:id/:kind`
  - `kind ∈ books|articles|videos|podcasts|tweets|answers`
  - 未登录访问 `visible = 0` 的人物的子页面会返回 `404`
  - 非 tweets：cursor 分页（`cursor` + `dir`）+ `pageSize`（默认 20，可选 10/20/50）
  - tweets：page 分页（`page` + `pageSize`），可加 `starred=1`

### 重建派生数据（KV）

- `POST /api/v1/people/:id/rebuild-counts`（鉴权）
  - 重建 counts（KV）与 tweets 索引（KV）

## Items API（通用 CRUD）

由 `worker/routes/items.ts` 实现，字段规则由 `SPECS` 驱动。

- `POST /api/v1/people/:personId/:kind`（鉴权）
  - 新建条目（kind 同上）
- `PUT /api/v1/:kind/:itemId`（鉴权）
  - 更新条目；当图片字段发生变更会删除旧 R2 key
  - tweets：`starred` 与 `datetime` 变更会更新/重建 KV 索引
- `DELETE /api/v1/:kind/:itemId`（鉴权）
  - 删除条目；会清理条目引用的 R2 keys（如 cover/imgs）

## 上传与公开读取（R2）

由 `worker/routes/r2.ts` 实现。

### 上传

- `POST /api/v1/uploads?prefix=avatars|covers|tweets`（鉴权）
  - raw body（`Content-Type: image/*`）
  - 返回：`{ key }`（R2 object key，例如 `avatars/<uuid>.png`）
  - 限制：最大 10MB

### 删除

- `DELETE /api/v1/uploads/<key>`（鉴权）
  - 只允许删除 R2 key；如果传入外链 URL 会返回错误（外链不在 R2）

### 公开读取

- `GET /r2/<key>`
  - 公开读取 R2 对象
  - 默认设置强缓存（`Cache-Control: public, max-age=31536000, immutable`）


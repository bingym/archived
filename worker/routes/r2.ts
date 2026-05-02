import { Hono } from "hono";
import type { Env, UploadPrefix } from "../types";
import { requireAdmin } from "../middleware/auth";

const ALLOWED_PREFIXES: UploadPrefix[] = ["avatars", "covers", "tweets"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function extFromContentType(contentType: string): string {
  const t = contentType.toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("png")) return "png";
  if (t.includes("gif")) return "gif";
  if (t.includes("webp")) return "webp";
  if (t.includes("svg")) return "svg";
  if (t.includes("avif")) return "avif";
  return "bin";
}

const uploads = new Hono<{ Bindings: Env }>();

uploads.post("/", requireAdmin, async (c) => {
  const prefix = (c.req.query("prefix") ?? "") as UploadPrefix;
  if (!ALLOWED_PREFIXES.includes(prefix)) {
    return c.json({ error: "Invalid prefix" }, 400);
  }
  const contentType = c.req.header("Content-Type") ?? "";
  if (!contentType.startsWith("image/")) {
    return c.json({ error: "Content-Type must be image/*" }, 400);
  }
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) {
    return c.json({ error: "Empty body" }, 400);
  }
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return c.json({ error: "File too large" }, 413);
  }

  const ext = extFromContentType(contentType);
  const id = crypto.randomUUID();
  const key = `${prefix}/${id}.${ext}`;

  await c.env.R2.put(key, body, {
    httpMetadata: { contentType },
  });

  return c.json({ key });
});

uploads.delete("/:key{.+}", requireAdmin, async (c) => {
  const key = c.req.param("key");
  if (!key) return c.json({ error: "Missing key" }, 400);
  if (/^https?:\/\//i.test(key)) {
    return c.json({ error: "External URLs are not stored in R2" }, 400);
  }
  await c.env.R2.delete(key);
  return c.json({ ok: true });
});

export const r2Public = new Hono<{ Bindings: Env }>();

r2Public.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  if (!key) return c.text("Not found", 404);
  const obj = await c.env.R2.get(key);
  if (!obj) return c.text("Not found", 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new Response(obj.body, { headers });
});

export default uploads;

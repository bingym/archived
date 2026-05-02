#!/usr/bin/env node
/**
 * 流式读取 wangxing 微博 JSON 数组（每项含 index / text / datetime / meta / imgs），
 * 将 imgs 内 base64 解码后经 sharp 转为 PNG，用 wrangler 上传到 R2，并生成 tweets INSERT SQL；
 * imgs 列为 JSON 字符串数组（R2 object key），与 wrangler.toml 中 bucket 默认 archived 一致。
 *
 * 默认 JSON：仓库内 data/wangxing/wangxing.json；大文件请用 --json 指向本机路径。
 *
 * Usage:
 *   node scripts/import-wangxing-tweets.mjs --json /path/to/wangxing.json
 *   node scripts/import-wangxing-tweets.mjs --no-upload          # 只写 SQL，imgs 为 NULL
 *   node scripts/import-wangxing-tweets.mjs --remote           # 上传到远端 R2（需 wrangler login）
 *
 * Apply SQL:
 *   wrangler d1 execute archived --local  --file=scripts/generated/wangxing_tweets.sql
 *   wrangler d1 execute archived --remote --file=scripts/generated/wangxing_tweets.sql
 */

import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream, mkdirSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import sharp from "sharp";
import pLimit from "p-limit";

const require = createRequire(import.meta.url);
const { chain } = require("stream-chain");
const { parser } = require("stream-json");
const streamArray = require("stream-json/streamers/stream-array.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_JSON = join(ROOT, "data", "wangxing", "wangxing.json");
const DEFAULT_OUT = join(ROOT, "scripts", "generated", "wangxing_tweets.sql");
const DEFAULT_PERSON = "wangxing";
const DEFAULT_BUCKET = "archived";

function parseArgs(argv) {
  let out = DEFAULT_OUT;
  let jsonPath = DEFAULT_JSON;
  let personId = DEFAULT_PERSON;
  let bucket = DEFAULT_BUCKET;
  let withDelete = true;
  let upload = true;
  let remote = false;
  let uploadConcurrency = 4;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
    else if (argv[i] === "--json" && argv[i + 1]) jsonPath = argv[++i];
    else if (argv[i] === "--person" && argv[i + 1]) personId = argv[++i];
    else if (argv[i] === "--bucket" && argv[i + 1]) bucket = argv[++i];
    else if (argv[i] === "--no-delete") withDelete = false;
    else if (argv[i] === "--no-upload") upload = false;
    else if (argv[i] === "--remote") remote = true;
    else if (argv[i] === "--upload-concurrency" && argv[i + 1]) uploadConcurrency = Math.max(1, Number(argv[++i]) || 4);
  }
  return { out, jsonPath, personId, bucket, withDelete, upload, remote, uploadConcurrency };
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''").replace(/\0/g, "")}'`;
}

function normalizeBase64(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  const m = /^data:[^;]+;base64,(.*)$/is.exec(s);
  if (m) s = m[1];
  return s.replace(/\s+/g, "");
}

function tweetStableId(item, fallbackSeq) {
  if (item && item.index != null && item.index !== "") {
    const n = Number(item.index);
    if (!Number.isNaN(n)) return String(n);
    return String(item.index).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || String(fallbackSeq);
  }
  return String(fallbackSeq);
}

function putR2(bucket, key, filePath, remote) {
  const r2Path = `${bucket}/${key}`;
  const args = ["wrangler", "r2", "object", "put", r2Path, "--file", filePath, "--content-type", "image/png", "-y"];
  if (remote) args.push("--remote");
  else args.push("--local");
  execFileSync("npx", args, { cwd: ROOT, stdio: "pipe" });
}

async function decodeToPngPath(buf, tmpDir) {
  const outPath = join(tmpDir, `w-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
  await sharp(buf).rotate().png({ compressionLevel: 9 }).toFile(outPath);
  return outPath;
}

async function uploadImgsForTweet(item, stableId, { bucket, upload, remote, uploadConcurrency, personId }) {
  const imgs = Array.isArray(item?.imgs) ? item.imgs : [];
  if (!upload || imgs.length === 0) return [];

  const limit = pLimit(uploadConcurrency);
  const tmpDir = mkdtempSync(join(tmpdir(), "wangxing-img-"));
  const keys = [];

  try {
    const tasks = imgs.map((raw, i) =>
      limit(async () => {
        const b64 = normalizeBase64(raw);
        if (!b64) return null;
        let buf;
        try {
          buf = Buffer.from(b64, "base64");
        } catch {
          return null;
        }
        if (buf.length < 16) return null;
        let pngPath;
        try {
          pngPath = await decodeToPngPath(buf, tmpDir);
        } catch {
          return null;
        }
        const key = `tweets/${personId}-${stableId}-${i}.png`;
        try {
          putR2(bucket, key, pngPath, remote);
          return key;
        } catch (e) {
          console.warn(`R2 put failed ${key}:`, e?.message || e);
          return null;
        } finally {
          try {
            unlinkSync(pngPath);
          } catch {
            /* ignore */
          }
        }
      })
    );
    const settled = await Promise.all(tasks);
    for (const k of settled) {
      if (k) keys.push(k);
    }
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  return keys;
}

async function main() {
  const { out, jsonPath, personId, bucket, withDelete, upload, remote, uploadConcurrency } = parseArgs(process.argv);
  const now = Date.now();
  mkdirSync(dirname(out), { recursive: true });

  const sqlStream = createWriteStream(out, { encoding: "utf8" });
  sqlStream.write(`-- Generated by scripts/import-wangxing-tweets.mjs\n`);
  sqlStream.write(`-- Source: ${jsonPath}\n`);
  sqlStream.write(`-- person_id: ${personId}, upload: ${upload}, remote R2: ${remote}\n\n`);
  if (withDelete) {
    sqlStream.write(`DELETE FROM tweets WHERE person_id = ${sqlLiteral(personId)};\n\n`);
  }

  let insertCount = 0;
  let seq = 0;

  const source = chain([createReadStream(jsonPath, { encoding: "utf8" }), parser(), streamArray()]);

  const processor = new Transform({
    objectMode: true,
    highWaterMark: 2,
    transform(chunk, _enc, cb) {
      (async () => {
        const item = chunk?.value;
        seq += 1;
        if (!item || typeof item !== "object") {
          cb();
          return;
        }
        const datetime = typeof item.datetime === "string" ? item.datetime.trim() : "";
        const content = typeof item.text === "string" ? item.text.replace(/\0/g, "") : "";
        const metaRaw = typeof item.meta === "string" ? item.meta.trim() : "";
        const metadata = metaRaw === "" ? null : metaRaw.replace(/\0/g, "");

        if (!datetime && !content && !(Array.isArray(item.imgs) && item.imgs.length)) {
          cb();
          return;
        }

        const stableId = tweetStableId({ ...item, index: item.index ?? seq }, seq);
        let r2Keys = [];
        try {
          r2Keys = await uploadImgsForTweet(item, stableId, {
            bucket,
            upload,
            remote,
            uploadConcurrency,
            personId,
          });
        } catch (e) {
          console.warn(`tweet seq ${seq} imgs upload error:`, e?.message || e);
        }

        const imgsSql =
          r2Keys.length > 0 ? sqlLiteral(JSON.stringify(r2Keys)) : "NULL";

        const sql = [
          "INSERT INTO tweets (person_id, datetime, content, metadata, imgs, created_at, updated_at) VALUES (",
          [
            sqlLiteral(personId),
            sqlLiteral(datetime || null),
            sqlLiteral(content),
            metadata === null ? "NULL" : sqlLiteral(metadata),
            imgsSql,
            String(now),
            String(now),
          ].join(", "),
          ");",
        ].join("");
        sqlStream.write(`${sql}\n`);
        insertCount += 1;
        if (insertCount % 500 === 0) console.error(`… ${insertCount} tweets`);
        cb();
      })().catch(cb);
    },
  });

  await pipeline(source, processor);

  sqlStream.write(`\n-- INSERT count: ${insertCount}\n`);
  await new Promise((res, rej) => {
    sqlStream.end((e) => (e ? rej(e) : res()));
  });

  console.log(`Wrote ${out} (${insertCount} INSERTs)`);
  if (upload) {
    console.log(`R2 bucket: ${bucket}, ${remote ? "remote" : "local"}`);
  }
  console.log("Apply with:");
  console.log(`  wrangler d1 execute archived --local  --file=${out}`);
  console.log(`  wrangler d1 execute archived --remote --file=${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

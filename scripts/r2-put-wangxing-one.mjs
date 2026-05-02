#!/usr/bin/env node
/**
 * 补传单张 wangxing 图到 R2（与 import-wangxing-tweets 相同 key 规则）。
 *
 * 从 JSON 流式查找（大文件友好）：
 *   node scripts/r2-put-wangxing-one.mjs --json /path/to/wangxing.json --index 5354 --img 0 --remote
 *
 * 已有 PNG 直传：
 *   node scripts/r2-put-wangxing-one.mjs --file ./x.png --key tweets/wangxing-5354-0.png --remote
 */

import { execFileSync } from "node:child_process";
import { createReadStream, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { chain } = require("stream-chain");
const { parser } = require("stream-json");
const streamArray = require("stream-json/streamers/stream-array.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function parseArgs(argv) {
  let jsonPath = "";
  let index = null;
  let img = 0;
  let filePath = "";
  let key = "";
  let bucket = "archived";
  let personId = "wangxing";
  let remote = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json" && argv[i + 1]) jsonPath = argv[++i];
    else if (argv[i] === "--index" && argv[i + 1]) index = Number(argv[++i]);
    else if (argv[i] === "--img" && argv[i + 1]) img = Number(argv[++i]) || 0;
    else if (argv[i] === "--file" && argv[i + 1]) filePath = argv[++i];
    else if (argv[i] === "--key" && argv[i + 1]) key = argv[++i];
    else if (argv[i] === "--bucket" && argv[i + 1]) bucket = argv[++i];
    else if (argv[i] === "--person" && argv[i + 1]) personId = argv[++i];
    else if (argv[i] === "--remote") remote = true;
    else if (argv[i] === "--local") remote = false;
  }
  return { jsonPath, index, img, filePath, key, bucket, personId, remote };
}

function normalizeBase64(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  const m = /^data:[^;]+;base64,(.*)$/is.exec(s);
  if (m) s = m[1];
  return s.replace(/\s+/g, "");
}

function tweetStableId(item) {
  if (item && item.index != null && item.index !== "") {
    const n = Number(item.index);
    if (!Number.isNaN(n)) return String(n);
    return String(item.index).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  }
  throw new Error("tweet has no index");
}

function indexMatches(item, target) {
  if (!item || item.index == null) return false;
  const n = Number(item.index);
  if (!Number.isNaN(n) && n === target) return true;
  return String(item.index) === String(target);
}

function putR2(bucket, r2Key, pngPath, remote) {
  const r2Path = `${bucket}/${r2Key}`;
  const args = ["wrangler", "r2", "object", "put", r2Path, "--file", pngPath, "--content-type", "image/png", "-y"];
  args.push(remote ? "--remote" : "--local");
  execFileSync("npx", args, { cwd: ROOT, stdio: "inherit" });
}

async function findTweetByIndex(jsonPath, targetIndex) {
  const source = chain([createReadStream(jsonPath, { encoding: "utf8" }), parser(), streamArray()]);
  try {
    for await (const chunk of source) {
      const item = chunk?.value;
      if (item && typeof item === "object" && indexMatches(item, targetIndex)) {
        source.destroy();
        return item;
      }
    }
  } catch {
    /* destroy() 可能打断迭代 */
  }
  return null;
}

async function main() {
  const { jsonPath, index, img, filePath, key, bucket, personId, remote } = parseArgs(process.argv);

  if (filePath && key) {
    putR2(bucket, key, filePath, remote);
    console.log(`OK ${bucket}/${key}`);
    return;
  }

  if (!jsonPath || index === null || Number.isNaN(index)) {
    console.error(
      "用法:\n  从 JSON: --json <path> --index <n> [--img 0] [--person wangxing] [--bucket archived] [--remote|--local]\n  直传: --file <png> --key tweets/wangxing-5354-0.png [--remote|--local]"
    );
    process.exit(1);
  }

  const tweet = await findTweetByIndex(jsonPath, index);
  if (!tweet) {
    console.error(`未找到 index=${index} 的条目`);
    process.exit(1);
  }
  const imgs = Array.isArray(tweet.imgs) ? tweet.imgs : [];
  const raw = imgs[img];
  if (raw === undefined) {
    console.error(`该条无 imgs[${img}]`);
    process.exit(1);
  }
  const b64 = normalizeBase64(raw);
  if (!b64) {
    console.error("base64 为空");
    process.exit(1);
  }
  const buf = Buffer.from(b64, "base64");
  const stableId = tweetStableId(tweet);
  const r2Key = `tweets/${personId}-${stableId}-${img}.png`;

  const tmpDir = mkdtempSync(join(tmpdir(), "wangxing-one-"));
  const pngPath = join(tmpDir, "out.png");
  try {
    await sharp(buf).rotate().png({ compressionLevel: 9 }).toFile(pngPath);
    console.log(`上传 ${bucket}/${r2Key} …`);
    putR2(bucket, r2Key, pngPath, remote);
    console.log("OK");
  } finally {
    try {
      unlinkSync(pngPath);
    } catch {
      /* */
    }
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

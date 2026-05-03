#!/usr/bin/env node
/**
 * 将 tweets / answers 表中 `datetime` TEXT 规范为 ISO 风格 `YYYY-MM-DD HH:MM:SS`，
 * 使 `ORDER BY datetime DESC` 与真实时间顺序一致（补零前 `2015-9-24` 会错误地排在 `2015-11-17` 前）。
 *
 * 不依赖重新导入：通过 wrangler 读库、按 id 写 UPDATE，分块执行（每块最多 APPLY_CHUNK 条）。
 *
 * Usage:
 *   node scripts/normalize-datetime-text.mjs --dry-run
 *   node scripts/normalize-datetime-text.mjs --local          # 默认
 *   node scripts/normalize-datetime-text.mjs --remote
 *
 * 先 --dry-run 看将改多少行，再去掉 dry-run 执行。
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DB_NAME = "archived";
const OUT_DIR = join(ROOT, "scripts", "generated", "normalize_datetime_patch");
/** 单文件 UPDATE 条数上限（避免 D1 单次执行过大） */
const APPLY_CHUNK = 400;

const TABLES = ["tweets", "answers"];

/**
 * @param {string | null | undefined} raw
 * @returns {string | null} 规范化后的字符串；无法识别则返回 trim 后的原串（不强行改写）
 */
export function normalizeDatetimeText(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // 已是 YYYY-MM-DD HH:MM:SS 且各部分两位宽
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) return s;

  // 常见微博导出：YYYY-M-D H:MM 或 YYYY-MM-DD HH:MM，可选秒
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return s;

  const [, y, mo, d, h, mi, sec] = m;
  const p = (n) => String(Number(n)).padStart(2, "0");
  const secPart = sec != null && sec !== "" ? p(sec) : "00";
  return `${y}-${p(mo)}-${p(d)} ${p(h)}:${p(mi)}:${secPart}`;
}

function sqlLiteral(value) {
  if (value == null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseArgs(argv) {
  let dryRun = false;
  let remote = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") dryRun = true;
    if (argv[i] === "--remote") remote = true;
    if (argv[i] === "--local") remote = false;
  }
  return { dryRun, remote };
}

/**
 * 远程执行时 wrangler 常在 stdout 先打进度树，再输出 JSON；整段直接 JSON.parse 会失败。
 * 从第一个 `[` 或 `{` 起按括号深度（忽略字符串内字符）截取完整 JSON。
 */
function extractFirstJsonSlice(text) {
  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  let start;
  /** @type {"[" | "{"} */
  let openCh;
  /** @type {"]" | "}"} */
  let closeCh;
  if (arrStart >= 0 && (objStart < 0 || arrStart < objStart)) {
    start = arrStart;
    openCh = "[";
    closeCh = "]";
  } else if (objStart >= 0) {
    start = objStart;
    openCh = "{";
    closeCh = "}";
  } else {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseWranglerStdout(stdout) {
  const text = stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const slice = extractFirstJsonSlice(text);
    if (slice) {
      try {
        return JSON.parse(slice);
      } catch {
        /* fall through */
      }
    }
    throw new Error(`Invalid JSON from wrangler:\n${text.slice(0, 800)}`);
  }
}

function wranglerD1Execute(args) {
  const full = ["d1", "execute", DB_NAME, "--json", ...args];
  const r = spawnSync("npx", ["wrangler", ...full], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`wrangler failed (${r.status}): ${r.stderr || r.stdout}`);
  }
  return parseWranglerStdout(r.stdout);
}

function extractRows(json) {
  if (!Array.isArray(json) || json.length === 0) return [];
  const first = json[0];
  if (first && Array.isArray(first.results)) return first.results;
  return [];
}

function fetchIdDatetime(table, remote) {
  const flag = remote ? "--remote" : "--local";
  const cmd = `SELECT id, datetime FROM ${table} WHERE datetime IS NOT NULL AND trim(datetime) != ''`;
  const json = wranglerD1Execute([flag, "--command", cmd]);
  return extractRows(json);
}

function main() {
  const { dryRun, remote } = parseArgs(process.argv);
  const loc = remote ? "remote" : "local";

  /** @type {{ table: string; id: number; from: string; to: string }[]} */
  const changes = [];

  for (const table of TABLES) {
    const rows = fetchIdDatetime(table, remote);
    for (const row of rows) {
      const id = Number(row.id);
      const from = row.datetime == null ? "" : String(row.datetime);
      const to = normalizeDatetimeText(from);
      if (to == null || from === to) continue;
      changes.push({ table, id, from, to });
    }
  }

  console.log(`Database: ${DB_NAME} (${loc})`);
  console.log(`Rows to update: ${changes.length}`);
  if (changes.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const preview = changes.slice(0, 12);
  for (const c of preview) {
    console.log(`  ${c.table} id=${c.id}`);
    console.log(`    ${c.from}`);
    console.log(` -> ${c.to}`);
  }
  if (changes.length > preview.length) {
    console.log(`  ... and ${changes.length - preview.length} more`);
  }

  if (dryRun) {
    console.log("\nDry run: no writes. Run without --dry-run to apply.");
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString();
  const chunks = [];
  for (let i = 0; i < changes.length; i += APPLY_CHUNK) {
    chunks.push(changes.slice(i, i + APPLY_CHUNK));
  }

  console.log(`\nApplying ${changes.length} updates in ${chunks.length} chunk(s) → ${OUT_DIR}`);

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const chunkPath = join(OUT_DIR, `part_${String(ci).padStart(4, "0")}.sql`);
    // 远程 D1 不接受 SQL 里的 BEGIN TRANSACTION / COMMIT（见 wrangler 报错）。
    // 每条 UPDATE 单独提交即可；本地同样适用。
    const lines = [
      `-- ${stamp} ${loc} part ${ci + 1}/${chunks.length}`,
      ...chunk.map((c) => `UPDATE ${c.table} SET datetime = ${sqlLiteral(c.to)} WHERE id = ${c.id};`),
    ];
    writeFileSync(chunkPath, lines.join("\n") + "\n", "utf8");

    const apply = wranglerD1Execute([remote ? "--remote" : "--local", "--file", chunkPath]);
    if (apply && Array.isArray(apply) && apply.some((x) => x.success === false)) {
      throw new Error(`Apply failed on part ${ci}: ${JSON.stringify(apply).slice(0, 800)}`);
    }
    console.log(`  ok part ${ci + 1}/${chunks.length} (${chunk.length} rows)`);
  }
  console.log("Applied successfully.");
}

main();

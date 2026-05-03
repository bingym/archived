import type { Env } from "../types";

type D1LogEnv = Pick<Env, "LOG_D1_META">;

function d1MetaLoggingEnabled(env: D1LogEnv): boolean {
  const v = env.LOG_D1_META;
  if (v == null || v === "") return false;
  return v === "1" || /^true$/i.test(v) || /^yes$/i.test(v);
}

/** 在 `.dev.vars` 中设置 `LOG_D1_META=1`（或 `true`）时，把 D1 的 `meta`（含 rows_read / rows_written 等）打到 wrangler 控制台。 */
export function logD1Meta(env: D1LogEnv, label: string, result: { meta: D1Meta }): void {
  if (!d1MetaLoggingEnabled(env)) return;
  console.log(`[D1 meta] ${label}`, result.meta);
}

export async function tapD1Meta<T>(
  env: D1LogEnv,
  label: string,
  promise: Promise<D1Result<T>>,
): Promise<D1Result<T>> {
  const r = await promise;
  logD1Meta(env, label, r);
  return r;
}

export async function tapD1BatchMeta<T>(
  env: D1LogEnv,
  label: string,
  promise: Promise<D1Result<T>[]>,
): Promise<D1Result<T>[]> {
  const rows = await promise;
  if (!d1MetaLoggingEnabled(env)) return rows;
  rows.forEach((r, i) => {
    console.log(`[D1 meta] ${label}[${i}]`, r.meta);
  });
  return rows;
}

/** `.first()` 不返回 `meta`，开发排障时用 `all()` 取首行并打 `meta`。 */
export async function tapD1First<T>(env: D1LogEnv, label: string, stmt: D1PreparedStatement): Promise<T | null> {
  const r = await tapD1Meta(env, label, stmt.all<T>());
  return r.results[0] ?? null;
}

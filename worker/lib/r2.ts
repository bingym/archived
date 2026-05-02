import type { Env } from "../types";

export function isR2Key(value: string | null | undefined): value is string {
  if (!value) return false;
  return !/^https?:\/\//i.test(value);
}

export async function deleteR2Keys(env: Env, keys: string[]): Promise<void> {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (unique.length === 0) return;
  // R2 supports passing an array of keys to delete.
  await env.R2.delete(unique);
}

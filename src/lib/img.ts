import { apiFetch, getToken } from "../auth";

export type UploadPrefix = "avatars" | "covers" | "tweets";

const R2_CDN_BASE = import.meta.env.PROD
  ? "https://archived.cdn.1994.link"
  : "/r2";

/** Resolve a stored image reference (R2 key or external URL) to a renderable src. */
export function resolveImg(value: string | null | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${R2_CDN_BASE}/${value.replace(/^\/+/, "")}`;
}

export function isR2Key(value: string | null | undefined): value is string {
  if (!value) return false;
  return !/^https?:\/\//i.test(value);
}

export async function uploadImage(file: File, prefix: UploadPrefix): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`/api/v1/uploads?prefix=${prefix}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { key: string };
  return data.key;
}

export async function deleteImage(key: string): Promise<void> {
  if (!isR2Key(key)) return;
  await apiFetch(`/api/v1/uploads/${encodeKeyForPath(key)}`, {
    method: "DELETE",
    throwOnError: false,
  });
}

function encodeKeyForPath(key: string): string {
  return key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

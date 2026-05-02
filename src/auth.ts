import { useEffect, useSyncExternalStore } from "react";

const TOKEN_KEY = "archived.adminToken";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return readToken();
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  for (const cb of listeners) cb();
}

export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, readToken, () => null);
}

export function useIsAuthed(): boolean {
  const t = useAuthToken();
  return !!t;
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | object | null;
  /** When true, throw if the response is not 2xx. Defaults to true. */
  throwOnError?: boolean;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { body, headers, throwOnError = true, ...rest } = options;
  const finalHeaders = new Headers(headers ?? {});
  const token = getToken();
  if (token) finalHeaders.set("Authorization", `Bearer ${token}`);

  let finalBody: BodyInit | undefined;
  if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) {
    finalHeaders.set("Content-Type", "application/json");
    finalBody = JSON.stringify(body);
  } else if (body instanceof Blob || body instanceof ArrayBuffer) {
    finalBody = body as BodyInit;
  } else if (body) {
    finalBody = body as BodyInit;
  }

  const res = await fetch(path, { ...rest, headers: finalHeaders, body: finalBody });
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok && throwOnError) {
    const msg =
      (parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error?: unknown }).error)
        : undefined) ?? `Request failed: ${res.status}`;
    throw new ApiError(msg, res.status, parsed);
  }
  return parsed as T;
}

/** Tiny convenience hook that re-renders when storage changes in another tab. */
export function useStorageSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        for (const cb of listeners) cb();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
}

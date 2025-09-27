const BASE = import.meta.env.VITE_API_BASE_URL ?? "https://exoplanet-api-lg16.onrender.com";

/** Build absolute URL for a relative API path. */
export function urlFor(path: string): string {
  return path.startsWith("http") ? path : `${BASE}${path}`;
}

/** Append query params to a path. Skips null/undefined/empty string. */
export function withQuery(path: string, params: Record<string, unknown>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.append(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * JSON HTTP helper. Throws Error on non-2xx with URL/status/body for debugging.
 */
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const url = urlFor(path);
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  } as Record<string, string>;
  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}\n${body}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

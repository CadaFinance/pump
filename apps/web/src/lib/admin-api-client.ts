/** Admin API client — SIWE session cookie (httpOnly), not ?address= query params. */
export function adminApiUrl(path: string): string {
  const base =
    typeof window !== "undefined"
      ? ((window as Window & { __PUMP_API_BASE__?: string }).__PUMP_API_BASE__ ?? "")
      : "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base) {
    return new URL(`${base.replace(/\/$/, "")}${normalized}`).toString();
  }
  if (typeof window !== "undefined") {
    return new URL(normalized, window.location.origin).toString();
  }
  return normalized;
}

export function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(adminApiUrl(path), {
    ...init,
    credentials: "include",
  });
}

/** Parse admin API JSON; surface HTML gateway/timeout pages as readable errors. */
export async function readAdminJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const isHtml = text.trimStart().startsWith("<");
    if (isHtml && (response.status === 502 || response.status === 504 || response.status === 524)) {
      throw new Error(
        "Request timed out at the proxy. The operation may still have completed — refresh the page to verify."
      );
    }
    if (isHtml) {
      throw new Error(`Server returned HTML instead of JSON (HTTP ${response.status}).`);
    }
    throw new Error(text.slice(0, 200) || `Unexpected response (HTTP ${response.status}).`);
  }
  return (await response.json()) as T;
}

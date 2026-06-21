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

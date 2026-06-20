/** Build admin API URL (admin-console may set __PUMP_API_BASE__; Next dev uses same-origin). */
export function adminApiUrl(path: string, address: string): string {
  const base =
    typeof window !== "undefined"
      ? ((window as Window & { __PUMP_API_BASE__?: string }).__PUMP_API_BASE__ ?? "")
      : "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = base
    ? new URL(`${base.replace(/\/$/, "")}${normalized}`)
    : new URL(normalized, window.location.origin);
  url.searchParams.set("address", address);
  return url.toString();
}

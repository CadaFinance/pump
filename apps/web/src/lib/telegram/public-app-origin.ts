import type { NextRequest } from "next/server";

const INVALID_PUBLIC_HOSTNAMES = new Set(["0.0.0.0", "[::]", "::", ""]);

function normalizeHostname(hostname: string): string {
  const lower = hostname.toLowerCase();
  if (INVALID_PUBLIC_HOSTNAMES.has(lower)) {
    return "localhost";
  }
  return hostname;
}

function originFromHost(host: string, proto: string): string {
  const trimmed = host.trim();
  if (!trimmed) return "http://localhost:3012";

  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return "http://localhost:3012";
    }
  }

  const [hostname, port] = trimmed.split(":");
  const safeHost = normalizeHostname(hostname ?? trimmed);
  const portSuffix = port ? `:${port}` : "";
  return `${proto}://${safeHost}${portSuffix}`;
}

/**
 * Public site origin for OAuth redirect URIs.
 * Prefer NEXT_PUBLIC_APP_URL — never send 0.0.0.0 to Telegram.
 */
export function resolvePublicAppOrigin(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through
    }
  }

  if (!request) {
    return "http://localhost:3012";
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host")?.trim();
  if (!host) {
    return "http://localhost:3012";
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const hostname = host.split(":")[0] ?? host;
  const proto =
    forwardedProto ??
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0"
      ? "http"
      : "https");

  return originFromHost(host, proto);
}

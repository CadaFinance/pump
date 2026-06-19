/** Client-visible bundler RPC URL (defaults to same-origin Next.js proxy). */
export function getBundlerRpcUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL?.trim();
  if (configured && configured !== "CHANGE_ME") {
    if (configured.startsWith("/")) {
      if (typeof window !== "undefined") {
        return `${window.location.origin}${configured}`;
      }
      return configured;
    }
    return configured;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/bundler/rpc`;
  }
  return "/api/bundler/rpc";
}

/** Server-side Skandha upstream (used by /api/bundler/rpc proxy). */
export function getBundlerUpstreamUrl(): string {
  return process.env.BUNDLER_RPC_URL?.trim() || "http://127.0.0.1:14337/rpc";
}

export function isBundlerConfigured(): boolean {
  return Boolean(getBundlerUpstreamUrl());
}

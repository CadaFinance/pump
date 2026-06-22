import { connection } from "next/server";

/**
 * Route handlers that read request URL/query at runtime must call this when
 * `cacheComponents` is enabled — avoids NEXT_PRERENDER_INTERRUPTED build noise.
 */
export async function ensureDynamicRoute(): Promise<void> {
  await connection();
}

export function searchParam(request: Request, key: string): string | null {
  return new URL(request.url).searchParams.get(key);
}

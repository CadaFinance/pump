"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROUTES = ["/", "/create", "/missions", "/portfolio"] as const;

/**
 * Prefetch tab routes and warm the arena API so navigation feels instant after first paint.
 */
export function RouteWarmup() {
  const router = useRouter();

  useEffect(() => {
    for (const href of ROUTES) {
      router.prefetch(href);
    }

    void fetch("/api/tokens", { cache: "no-store" }).catch(() => undefined);
  }, [router]);

  return null;
}

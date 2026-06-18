"use client";

import { useEffect, useRef } from "react";

type UseInfiniteScrollSentinelOptions = {
  enabled: boolean;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
};

export function useInfiniteScrollSentinel({
  enabled,
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "120px",
}: UseInfiniteScrollSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!enabled || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || loading) return;
        void onLoadMoreRef.current();
      },
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasMore, loading, rootMargin]);

  return sentinelRef;
}

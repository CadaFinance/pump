"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

type BnbPriceResponse = {
  bnbUsd: number | null;
  source: string;
  pair: string;
};

async function fetchBnbPrice(): Promise<number | null> {
  const res = await fetch("/api/bnb-price", { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as BnbPriceResponse;
  const price = json.bnbUsd;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

/** BNB/USD from Binance BNBUSDT (30s refresh). */
export function useBnbUsdPrice() {
  const query = useQuery({
    queryKey: ["bnb-usd-price"],
    queryFn: fetchBnbPrice,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  return {
    bnbUsd: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

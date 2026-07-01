"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, type Address } from "viem";
import { useBnbUsdPrice } from "@/hooks/useBnbUsdPrice";
import { useScwBalance } from "@/hooks/useScwBalance";
import { usePortfolioQuery } from "@/hooks/usePortfolioQuery";
import { bnbToUsd } from "@/lib/format-usd";
import { PORTFOLIO_LAUNCHED_INITIAL } from "@/lib/portfolio-limits";
import {
  getCachedWalletTotal,
  subscribeWalletTotal,
  sumSnapshotHoldingsBnb,
  type WalletTotalSnapshot,
} from "@/lib/wallet-total-balance";

export function useWalletTotalBalance(address?: Address) {
  const normalized = address?.toLowerCase() ?? "";
  const { bnbUsd } = useBnbUsdPrice();
  const { data: balance } = useScwBalance(address);
  const [published, setPublished] = useState<WalletTotalSnapshot | null>(() =>
    normalized ? getCachedWalletTotal(normalized) : null
  );

  const portfolioQuery = usePortfolioQuery(normalized, PORTFOLIO_LAUNCHED_INITIAL, {
    enabled: Boolean(normalized),
  });

  useEffect(() => {
    if (!normalized) {
      setPublished(null);
      return;
    }
    setPublished(getCachedWalletTotal(normalized));
    return subscribeWalletTotal((snapshot) => {
      if (snapshot.address.toLowerCase() === normalized) {
        setPublished(snapshot);
      }
    });
  }, [normalized]);

  const nativeBnb = balance ? Number(formatEther(balance.value)) : 0;
  const nativeUsd = bnbToUsd(nativeBnb, bnbUsd) ?? 0;

  const fallbackHoldingsUsd = useMemo(() => {
    const positions = portfolioQuery.data?.positions;
    if (!positions?.length) return 0;
    return bnbToUsd(sumSnapshotHoldingsBnb(positions), bnbUsd) ?? 0;
  }, [portfolioQuery.data?.positions, bnbUsd]);

  const holdingsUsd =
    published?.address.toLowerCase() === normalized ? published.holdingsUsd : fallbackHoldingsUsd;

  const totalUsd = holdingsUsd + nativeUsd;

  return {
    nativeBnb,
    nativeUsd,
    holdingsUsd,
    totalUsd,
    isPortfolioEnriched: published?.address.toLowerCase() === normalized,
  };
}

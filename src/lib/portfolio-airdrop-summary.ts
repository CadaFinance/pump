import type { MyAirdropParticipation } from "@/lib/db/airdrops";
import {
  airdropRewardAmountUsd,
  projectedRankRewardUsd,
} from "@/lib/airdrop-board-format";

export function airdropRewardMeta(item: MyAirdropParticipation) {
  return {
    rewardToken: item.rewardToken,
    rewardSymbol: item.rewardSymbol,
    rewardPriceBnb: item.rewardPriceBnb,
    totalFunded: item.totalFunded,
  };
}

export function trimTrailingZeros(formatted: string): string {
  if (!formatted.includes(".")) return formatted;
  return formatted.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function formatEstPayoutUsd(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${trimTrailingZeros(value.toFixed(4))}`;
  return `$${trimTrailingZeros(value.toFixed(6))}`;
}

export function claimableRewardUsd(
  item: MyAirdropParticipation,
  bnbUsd: number | null | undefined
): number | null {
  if (!item.claimableAmount || Number(item.claimableAmount) <= 0 || item.claimedAt) return null;
  return airdropRewardAmountUsd(item.claimableAmount, airdropRewardMeta(item), bnbUsd);
}

export function estimatedRewardUsd(
  item: MyAirdropParticipation,
  bnbUsd: number | null | undefined
): number | null {
  if (item.viewerRank == null || item.viewerRank < 1 || item.viewerRank > 100) return null;
  return projectedRankRewardUsd(
    item.totalFunded,
    item.viewerRank,
    airdropRewardMeta(item),
    bnbUsd
  );
}

export function isReadyToClaim(item: MyAirdropParticipation): boolean {
  return (
    item.displayStatus === "CLAIMABLE" &&
    item.nextAction === "claim" &&
    !item.claimedAt &&
    Boolean(item.claimableAmount && Number(item.claimableAmount) > 0) &&
    Boolean(item.onChainId)
  );
}

export function partitionJoinedAirdrops(items: MyAirdropParticipation[]) {
  const claimable: MyAirdropParticipation[] = [];
  const qualifying: MyAirdropParticipation[] = [];
  const finalizing: MyAirdropParticipation[] = [];
  const claimed: MyAirdropParticipation[] = [];
  const other: MyAirdropParticipation[] = [];

  for (const item of items) {
    if (item.claimedAt) {
      claimed.push(item);
      continue;
    }
    if (isReadyToClaim(item)) {
      claimable.push(item);
      continue;
    }
    if (item.displayStatus === "QUALIFYING") {
      qualifying.push(item);
      continue;
    }
    if (item.displayStatus === "FINALIZING") {
      finalizing.push(item);
      continue;
    }
    other.push(item);
  }

  return { claimable, qualifying, finalizing, claimed, other };
}

export function sumUsd(values: Array<number | null | undefined>): number {
  return values.reduce<number>((sum, value) => {
    if (value == null || !Number.isFinite(value) || value <= 0) return sum;
    return sum + value;
  }, 0);
}

export function poolSymbol(item: MyAirdropParticipation): string {
  return item.linkedSymbol ?? item.linkedToken.slice(0, 6);
}

export function tickerLabel(item: MyAirdropParticipation): string {
  const symbol = poolSymbol(item);
  return symbol.startsWith("$") ? symbol : `$${symbol}`;
}

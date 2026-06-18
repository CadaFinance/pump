import { getAirdropDisplayStatus, isPromotableAirdropStatus } from "@/lib/airdrop-status";
import type { AirdropListItem } from "@/lib/db/airdrops";

/** Linked tokens with upcoming or qualifying airdrop (arena gift icon). */
export function collectOpenAirdropLinkedTokens(airdrops: AirdropListItem[]): Set<string> {
  const addresses = new Set<string>();

  for (const airdrop of airdrops) {
    const displayStatus = getAirdropDisplayStatus({
      status: airdrop.status,
      qualifyStart: airdrop.qualifyStart,
      qualifyEnd: airdrop.qualifyEnd,
      claimEnd: airdrop.claimEnd,
    });
    if (!isPromotableAirdropStatus(displayStatus)) continue;

    addresses.add(airdrop.linkedToken.toLowerCase());
  }

  return addresses;
}

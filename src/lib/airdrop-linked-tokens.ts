import { getAirdropDisplayStatus } from "@/lib/airdrop-status";
import type { AirdropListItem } from "@/lib/db/airdrops";

/** Linked launchpad tokens with a non-closed airdrop (for arena gift icon + filter). */
export function collectOpenAirdropLinkedTokens(airdrops: AirdropListItem[]): Set<string> {
  const addresses = new Set<string>();

  for (const airdrop of airdrops) {
    if (airdrop.status === "CLOSED") continue;

    const displayStatus = getAirdropDisplayStatus({
      status: airdrop.status,
      qualifyStart: airdrop.qualifyStart,
      qualifyEnd: airdrop.qualifyEnd,
      claimEnd: airdrop.claimEnd,
    });
    if (displayStatus === "CLOSED") continue;

    addresses.add(airdrop.linkedToken.toLowerCase());
  }

  return addresses;
}

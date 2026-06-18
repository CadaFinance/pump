import { contracts, explorerAddressUrl, explorerTxUrl } from "@/config/chain";
import { formatAirdropReward } from "@/lib/airdrop-board-format";

export const AIRDROP_GUARANTEE_HEADLINE = "100% funded reward pool";

export const AIRDROP_GUARANTEE_TAGLINE =
  "Creators lock rewards in the PumpAirdropManager contract before qualify opens. Winners claim with on-chain Merkle proofs — the pool cannot be withdrawn early.";

export const AIRDROP_GUARANTEE_STEPS = [
  {
    title: "Lock on-chain",
    body: "Reward tokens or BNB are deposited into escrow when the campaign is created.",
  },
  {
    title: "Qualify fairly",
    body: "TOP 100 linked-token holders by balance at qualify end share the locked pool.",
  },
  {
    title: "Claim with proof",
    body: "Winners receive a Merkle proof and claim directly from the contract.",
  },
] as const;

export const HIGH_VALUE_USD_THRESHOLD = 10_000;

type AirdropTrustInput = {
  totalFunded: string;
  rewardToken: string | null;
  rewardSymbol: string | null;
  createTxHash?: string | null;
  onChainId?: string | null;
};

export function airdropManagerAddress(): `0x${string}` | null {
  return contracts.airdropManager ?? null;
}

export function airdropManagerExplorerUrl(): string | null {
  const address = airdropManagerAddress();
  return address ? explorerAddressUrl(address) : null;
}

export function formatLockedPoolLabel(
  totalFunded: string,
  rewardToken: string | null,
  rewardSymbol: string | null
): string {
  return formatAirdropReward(totalFunded, {
    isBnb: !rewardToken,
    symbol: rewardSymbol,
  });
}

export function airdropTrustLinks(input: AirdropTrustInput) {
  const manager = airdropManagerAddress();
  return {
    manager,
    managerUrl: manager ? explorerAddressUrl(manager) : null,
    createTxUrl: input.createTxHash ? explorerTxUrl(input.createTxHash) : null,
    lockedLabel: formatLockedPoolLabel(
      input.totalFunded,
      input.rewardToken,
      input.rewardSymbol
    ),
    onChainId: input.onChainId ?? null,
  };
}

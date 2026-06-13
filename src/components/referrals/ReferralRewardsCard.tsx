"use client";

import { formatEther } from "viem";
import { InviteLinkPanel } from "@/components/referrals/InviteLinkPanel";
import { bnbToUsd, formatUsdReadable } from "@/lib/format-usd";

type ReferralRewardsCardProps = {
  address: string;
  claimedBnb: number;
  pendingWei: bigint | undefined;
  inviteCount: number;
  referralVolumeBnb: number;
  bnbUsd: number | null;
  onClaimClick: () => void;
};

function formatFeeBnb(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
}

export function ReferralRewardsCard({
  address,
  claimedBnb,
  pendingWei,
  inviteCount,
  referralVolumeBnb,
  bnbUsd,
  onClaimClick,
}: ReferralRewardsCardProps) {
  const pendingBnb = pendingWei != null ? Number(formatEther(pendingWei)) : 0;
  const totalBnb = claimedBnb + pendingBnb;
  const totalUsd = bnbToUsd(totalBnb, bnbUsd);
  const hasRewards = totalBnb > 0 || pendingBnb > 0;

  return (
    <div className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-2">
      <p className="section-label text-[10px] md:hidden">Referral rewards</p>
      <div className="rounded-md border border-pump-border/15 bg-pump-surface/35 p-2.5 md:flex md:flex-col md:gap-2 md:p-3">
        <div className="md:flex md:items-center md:justify-between md:gap-3">
          <div className="min-w-0 md:flex md:flex-1 md:items-center md:justify-between md:gap-3">
            <span className="section-label hidden shrink-0 md:inline">Referral rewards</span>
            {hasRewards ? (
              <div className="min-w-0">
                <p className="financial-value text-body-sm font-semibold text-pump-text">
                  {formatUsdReadable(totalUsd, { compact: true })}
                </p>
                <p className="mt-0.5 text-caption text-pump-muted">
                  {formatFeeBnb(totalBnb)} BNB · {formatFeeBnb(claimedBnb)} claimed ·{" "}
                  {formatFeeBnb(pendingBnb)} pending
                </p>
              </div>
            ) : (
              <p className="text-caption text-pump-muted">
                Share your link — earn BNB when invitees trade before binding.
              </p>
            )}
          </div>
          {hasRewards ? (
            <button
              type="button"
              onClick={onClaimClick}
              className="chip-button chip-button-active mt-2 w-full shrink-0 md:mt-0 md:w-auto"
            >
              Claim rewards
            </button>
          ) : null}
        </div>
        <InviteLinkPanel
          address={address}
          inviteCount={inviteCount}
          referralVolumeBnb={referralVolumeBnb}
          bnbUsd={bnbUsd}
        />
      </div>
    </div>
  );
}

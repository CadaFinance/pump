import { ExternalLink } from "lucide-react";
import { shortAddress } from "@/config/chain";
import { airdropTrustLinks } from "@/lib/airdrop-trust";
import { ICON_STROKE } from "@/lib/icons";
import { AirdropGuaranteeBadge } from "@/components/airdrops/AirdropGuaranteeBadge";

type AirdropTrustPanelProps = {
  totalFunded: string;
  rewardToken: string | null;
  rewardSymbol: string | null;
  createTxHash?: string | null;
  onChainId?: string | null;
  compact?: boolean;
};

export function AirdropTrustPanel({
  totalFunded,
  rewardToken,
  rewardSymbol,
  createTxHash,
  onChainId,
  compact = false,
}: AirdropTrustPanelProps) {
  const links = airdropTrustLinks({
    totalFunded,
    rewardToken,
    rewardSymbol,
    createTxHash,
    onChainId,
  });

  return (
    <section
      className={`airdrop-trust-panel rounded-lg border border-pump-border/25 bg-pump-surface/40 ${
        compact ? "p-3" : "p-3 md:p-4"
      }`}
      aria-label="On-chain escrow verification"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="section-label">On-chain guarantee</p>
        <AirdropGuaranteeBadge compact={compact} />
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-caption text-pump-muted">Locked in escrow</dt>
          <dd className="financial-value mt-0.5 text-body-sm font-semibold text-pump-text">
            {links.lockedLabel}
          </dd>
        </div>
        {links.onChainId ? (
          <div className="min-w-0">
            <dt className="text-caption text-pump-muted">Campaign ID</dt>
            <dd className="financial-value mt-0.5 text-body-sm text-pump-text">
              #{links.onChainId}
            </dd>
          </div>
        ) : null}
      </dl>

      <ul className="mt-3 space-y-1 text-caption leading-relaxed text-pump-muted">
        <li>Rewards are locked in PumpAirdropManager before qualify opens.</li>
        <li>Creators cannot withdraw the pool during the qualify window.</li>
        <li>Winners claim with Merkle proofs after results are finalized on-chain.</li>
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {links.managerUrl ? (
          <a
            href={links.managerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button inline-flex h-8 items-center gap-1.5 px-3 text-caption"
          >
            Escrow contract
            <ExternalLink className="h-3 w-3" strokeWidth={ICON_STROKE} aria-hidden />
          </a>
        ) : null}
        {links.createTxUrl ? (
          <a
            href={links.createTxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button inline-flex h-8 items-center gap-1.5 px-3 text-caption"
          >
            Create tx {shortAddress(createTxHash!, true)}
            <ExternalLink className="h-3 w-3" strokeWidth={ICON_STROKE} aria-hidden />
          </a>
        ) : null}
        {links.manager ? (
          <span className="inline-flex h-8 items-center px-1 text-caption text-pump-muted">
            Manager {shortAddress(links.manager)}
          </span>
        ) : null}
      </div>
    </section>
  );
}

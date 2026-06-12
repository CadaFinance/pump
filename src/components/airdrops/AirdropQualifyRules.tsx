"use client";

import type { TokenListItem } from "@/lib/db/launchpad";
import { TokenAvatar } from "@/components/token/TokenAvatar";

function PoolTokenAvatar({
  token,
  size = 36,
  className = "",
}: {
  token: TokenListItem | null;
  size?: number;
  className?: string;
}) {
  if (!token) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-dashed border-pump-border/30 bg-pump-surface/40 text-[10px] text-pump-muted ${className}`}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <TokenAvatar
      address={token.address}
      symbol={token.symbol}
      logoUrl={token.logoUrl}
      size={size}
      className={`shrink-0 ${className}`.trim()}
    />
  );
}

function formatHoldAmount(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

type AirdropQualifyRulesEditorProps = {
  linkedToken: TokenListItem | null;
  minHoldTokens: string;
  minBuyBnb: string;
  onMinHoldChange: (value: string) => void;
  onMinBuyChange: (value: string) => void;
};

export function AirdropQualifyRulesEditor({
  linkedToken,
  minHoldTokens,
  minBuyBnb,
  onMinHoldChange,
  onMinBuyChange,
}: AirdropQualifyRulesEditorProps) {
  const symbol = linkedToken?.symbol ?? "TOKEN";
  const name = linkedToken?.name ?? "pool token";

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-md border border-pump-border/15 bg-pump-surface/35 p-3">
        <div className="flex gap-3">
          <PoolTokenAvatar token={linkedToken} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-body-sm text-pump-text">
              Hold at least{" "}
              <span className="font-semibold text-pump-accent">${symbol}</span>
            </p>
            <p className="mt-0.5 text-caption text-pump-muted truncate">{name}</p>
            <input
              id="minHold"
              inputMode="decimal"
              className="field-input financial-value mt-2"
              value={minHoldTokens}
              onChange={(e) => onMinHoldChange(e.target.value)}
              placeholder="e.g. 1000"
            />
            <p className="mt-1 field-hint">
              Minimum {symbol} balance in wallet when qualification ends.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-pump-border/15 bg-pump-surface/35 p-3">
        <div className="flex gap-3">
          <PoolTokenAvatar token={linkedToken} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-body-sm text-pump-text">
              Buy at least{" "}
              <span className="font-semibold text-pump-accent">BNB</span>
              {" of "}
              <span className="font-semibold text-pump-accent">${symbol}</span>
            </p>
            <p className="mt-0.5 text-caption text-pump-muted">
              During the qualify window on the bonding curve
            </p>
            <div className="relative mt-2">
              <input
                id="minBuy"
                inputMode="decimal"
                className="field-input financial-value pr-14"
                value={minBuyBnb}
                onChange={(e) => onMinBuyChange(e.target.value)}
                placeholder="0.01"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-caption font-medium text-pump-muted">
                BNB
              </span>
            </div>
            <p className="mt-1 field-hint">
              Total buy volume required to qualify (fees excluded).
            </p>
          </div>
        </div>
      </div>

      {!linkedToken ? (
        <p className="text-caption text-pump-warning">Select a pool token above to name these rules.</p>
      ) : null}
    </div>
  );
}

type AirdropQualifyRulesPreviewProps = {
  linkedToken: TokenListItem | null;
  minHoldTokens: string;
  minBuyBnb: string;
};

export function AirdropQualifyRulesPreview({
  linkedToken,
  minHoldTokens,
  minBuyBnb,
}: AirdropQualifyRulesPreviewProps) {
  const hasHold = minHoldTokens.trim().length > 0;
  const hasBuy = minBuyBnb.trim().length > 0;
  const symbol = linkedToken?.symbol ?? "TOKEN";

  if (!hasHold && !hasBuy) {
    return <span className="text-pump-muted">—</span>;
  }

  return (
    <div className="flex items-start justify-end gap-2">
      <p className="min-w-0 text-right text-caption leading-snug text-pump-text">
        {hasHold ? (
          <>
            Hold ≥ {formatHoldAmount(minHoldTokens)}{" "}
            <span className="font-medium text-pump-accent">${symbol}</span>
          </>
        ) : null}
        {hasHold && hasBuy ? <span className="text-pump-muted"> · </span> : null}
        {hasBuy ? (
          <>
            Buy ≥ {minBuyBnb} BNB <span className="text-pump-muted">of</span>{" "}
            <span className="font-medium text-pump-accent">${symbol}</span>
          </>
        ) : null}
      </p>
      <PoolTokenAvatar token={linkedToken} size={22} className="mt-0.5 shrink-0" />
    </div>
  );
}

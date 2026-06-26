"use client";

import { NativeCurrencyLogo } from "@/components/token/NativeCurrencyLogo";
import { NATIVE_SYMBOL } from "@/lib/native-currency";
import { TokenAvatar } from "@/components/token/TokenAvatar";

export function BnbAmountDisplay({
  amount,
  logoSize = 18,
  amountClassName = "financial-value font-medium tabular-nums text-pump-text",
  symbolClassName = "text-caption font-medium text-pump-muted",
}: {
  amount: string;
  logoSize?: number;
  amountClassName?: string;
  symbolClassName?: string;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center justify-end gap-1.5">
      <span className={`shrink-0 ${amountClassName}`}>{amount}</span>
      <NativeAssetChip size={logoSize} symbolClassName={symbolClassName} />
    </span>
  );
}

export function TokenAmountDisplay({
  amount,
  symbol,
  address,
  logoUrl,
  previewUrl,
  logoSize = 18,
  amountClassName = "financial-value font-medium tabular-nums text-pump-text",
  symbolClassName = "text-caption font-medium text-pump-muted",
}: {
  amount: string;
  symbol: string;
  address?: string;
  logoUrl?: string | null;
  previewUrl?: string | null;
  logoSize?: number;
  amountClassName?: string;
  symbolClassName?: string;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center justify-end gap-1.5">
      <span className={`truncate ${amountClassName}`}>{amount}</span>
      <TokenAssetChip
        address={address ?? "0x0000000000000000000000000000000000000000"}
        symbol={symbol}
        logoUrl={logoUrl}
        previewUrl={previewUrl}
        size={logoSize}
        symbolClassName={symbolClassName}
      />
    </span>
  );
}

export function NativeAssetChip({
  size = 18,
  symbolClassName = "text-caption font-medium text-pump-muted",
  className = "",
}: {
  size?: number;
  symbolClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 ${className}`}>
      <NativeCurrencyLogo size={size} />
      <span className={symbolClassName}>{NATIVE_SYMBOL}</span>
    </span>
  );
}

/** @deprecated Use NativeAssetChip */
export const BnbAssetChip = NativeAssetChip;

export function TokenAssetChip({
  address,
  symbol,
  logoUrl,
  previewUrl,
  size = 18,
  symbolClassName = "text-caption font-medium text-pump-muted",
  className = "",
}: {
  address: string;
  symbol: string;
  logoUrl?: string | null;
  previewUrl?: string | null;
  size?: number;
  symbolClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 ${className}`}>
      <TokenAvatar
        address={address}
        symbol={symbol}
        logoUrl={logoUrl}
        previewUrl={previewUrl}
        size={size}
      />
      <span className={symbolClassName}>${symbol}</span>
    </span>
  );
}

export function BnbAmountLabel({
  amount,
  logoSize = 12,
}: {
  amount: string;
  logoSize?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span>{amount}</span>
      <NativeCurrencyLogo size={logoSize} />
    </span>
  );
}

export function RewardAmountDisplay({
  amount,
  isBnb,
  token,
  amountClassName,
  logoSize,
}: {
  amount: string;
  isBnb: boolean;
  token?: { address: string; symbol: string; logoUrl?: string | null } | null;
  amountClassName?: string;
  logoSize?: number;
}) {
  if (amount === "—" || amount === "…") {
    return <span className="financial-value text-pump-text">{amount}</span>;
  }

  if (isBnb) {
    return (
      <BnbAmountDisplay amount={amount} amountClassName={amountClassName} logoSize={logoSize} />
    );
  }

  if (token) {
    return (
      <TokenAmountDisplay
        amount={amount}
        symbol={token.symbol}
        address={token.address}
        logoUrl={token.logoUrl}
        amountClassName={amountClassName}
        logoSize={logoSize}
      />
    );
  }

  return <span className="financial-value font-medium text-pump-text">{amount}</span>;
}

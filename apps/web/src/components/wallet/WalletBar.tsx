"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScwBalance } from "@/hooks/useScwBalance";
import { startScwDepositWatch } from "@/lib/scw-balance-sync";
import { NATIVE_SYMBOL, shortAddress } from "@/config/chain";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useUserAvatar } from "@/components/user/UserAvatarProvider";
import { useBnbUsdPrice } from "@/hooks/useBnbUsdPrice";
import { bnbToUsd } from "@/lib/format-usd";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { useWalletFunding } from "@/components/wallet/WalletFundingProvider";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";
import { isPumpAuthConfigured } from "@/lib/auth-config";
import { PumpIcon, faArrowLeftRight, faChevronDown, faCopy, faWallet } from "@/lib/icons";

function formatHeaderBalanceUsd(usd: number | null): string {
  if (usd == null || !Number.isFinite(usd)) return "$0.00";
  return `$${usd.toFixed(2)}`;
}

function formatHeaderBalanceNative(native: number): string {
  if (!Number.isFinite(native) || native <= 0) return `0 ${NATIVE_SYMBOL}`;
  if (native >= 1) return `${native.toFixed(4)} ${NATIVE_SYMBOL}`;
  if (native >= 0.0001) return `${native.toFixed(4)} ${NATIVE_SYMBOL}`;
  return `${native.toFixed(6)} ${NATIVE_SYMBOL}`;
}

function formatNativeAvailable(native: number): string {
  return formatHeaderBalanceNative(native);
}

type WalletMenuProps = {
  address: string;
  bnbAmount: number;
  usdAmount: number | null;
  showBnb: boolean;
  onToggleBalanceUnit: () => void;
  onClose: () => void;
  onLogout: () => void;
};

function WalletMenu({
  address,
  bnbAmount,
  usdAmount,
  showBnb,
  onToggleBalanceUnit,
  onClose,
  onLogout,
}: WalletMenuProps) {
  const { openDeposit, openWithdraw } = useWalletFunding();
  const [copied, setCopied] = useState(false);

  async function onCopyAddress(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const ok = await copyToClipboard(address);
    setCopied(ok);
    if (ok) {
      startScwDepositWatch();
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] border border-pump-border/50 bg-pump-card p-3"
      role="menu"
    >
      <p className="section-label text-pump-muted">Your balance</p>
      <button
        type="button"
        onClick={onToggleBalanceUnit}
        className="mt-1 block text-left transition hover:text-pump-accent"
        aria-label={showBnb ? "Show balance in USD" : `Show balance in ${NATIVE_SYMBOL}`}
      >
        <span className="financial-value text-2xl font-semibold text-pump-text">
          {showBnb ? formatHeaderBalanceNative(bnbAmount) : formatHeaderBalanceUsd(usdAmount)}
        </span>
      </button>
      <p className="mt-0.5 text-caption text-pump-muted">
        {showBnb
          ? `${formatHeaderBalanceUsd(usdAmount)} available`
          : `${formatNativeAvailable(bnbAmount)} available`}
      </p>

      <button
        type="button"
        onClick={(event) => void onCopyAddress(event)}
        className="mt-4 flex w-full items-center justify-between gap-2 border border-pump-border/45 bg-pump-border/4 px-3 py-2 text-caption text-pump-text transition hover:bg-pump-border/8"
        aria-label={copied ? "Address copied" : "Copy smart wallet address"}
      >
        <span className="financial-value">{shortAddress(address)}</span>
        <span className="flex items-center gap-1 text-pump-muted">
          {copied ? "Copied" : <PumpIcon icon={faCopy} className="h-3.5 w-3.5" />}
        </span>
      </button>
      <p className="mt-1 text-caption text-pump-muted">Smart wallet · deposit address</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            openDeposit();
          }}
          className="primary-button py-2.5 text-body-sm"
        >
          Deposit
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            openWithdraw();
          }}
          className="secondary-button py-2.5 text-body-sm"
        >
          Withdraw
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link
          href="/portfolio"
          onClick={onClose}
          className="flex flex-col items-center gap-2 border border-pump-border/45 bg-pump-border/4 px-3 py-3 text-center transition hover:bg-pump-border/8"
        >
          <span className="text-pump-muted">
            <PumpIcon icon={faWallet} className="h-5 w-5" />
          </span>
          <span className="text-body-sm font-semibold text-pump-text">Portfolio</span>
          <span className="text-caption text-pump-muted">Holdings</span>
        </Link>
        <Link
          href="/"
          onClick={onClose}
          className="flex flex-col items-center gap-2 border border-pump-border/45 bg-pump-border/4 px-3 py-3 text-center transition hover:bg-pump-border/8"
        >
          <span className="text-pump-muted">
            <PumpIcon icon={faArrowLeftRight} className="h-5 w-5" />
          </span>
          <span className="text-body-sm font-semibold text-pump-text">Trade</span>
          <span className="text-caption text-pump-muted">Browse Arena</span>
        </Link>
      </div>

      <button
        type="button"
        onClick={() => {
          onLogout();
          onClose();
        }}
        className="mt-3 w-full py-2.5 text-body-sm font-medium text-pump-danger transition hover:bg-pump-danger/10"
      >
        Log out
      </button>
    </div>
  );
}

function ConnectedWalletButton({ address }: { address: string }) {
  const { avatarId } = useUserAvatar();
  const { bnbUsd } = useBnbUsdPrice();
  const { logout } = usePumpWallet();
  const [open, setOpen] = useState(false);
  const [showBnb, setShowBnb] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: balance } = useScwBalance(address as `0x${string}`);

  const bnbAmount = balance ? Number(formatEther(balance.value)) : 0;
  const usdAmount = bnbToUsd(bnbAmount, bnbUsd);
  const balanceLabel = showBnb
    ? formatHeaderBalanceNative(bnbAmount)
    : formatHeaderBalanceUsd(usdAmount);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: globalThis.MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="toolbar-btn"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatarId ? (
          <UserAvatar address={address} avatarId={avatarId} size={22} />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-pump-success" aria-hidden />
        )}
        <span className="financial-value text-body-sm font-semibold">{balanceLabel}</span>
        <PumpIcon
          icon={faChevronDown}
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <WalletMenu
          address={address}
          bnbAmount={bnbAmount}
          usdAmount={usdAmount}
          showBnb={showBnb}
          onToggleBalanceUnit={() => setShowBnb((value) => !value)}
          onClose={() => setOpen(false)}
          onLogout={() => void logout()}
        />
      ) : null}
    </div>
  );
}

export function WalletBar() {
  const { ready, authenticated, scwAddress, login } = usePumpWallet();
  const { isConnected } = useAccount();

  const walletReady =
    ready && authenticated && Boolean(scwAddress) && isConnected;

  if (!isPumpAuthConfigured()) {
    return <span className="text-caption text-pump-muted">Configure sign-in to continue</span>;
  }

  return (
    <div
      {...(!ready && {
        "aria-hidden": true,
        style: {
          opacity: 0,
          pointerEvents: "none",
          userSelect: "none",
        },
      })}
    >
      {!walletReady ? (
        <button type="button" onClick={login} className="toolbar-btn text-body-sm font-semibold">
          Sign in
        </button>
      ) : scwAddress ? (
        <ConnectedWalletButton address={scwAddress} />
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { contracts, pumpChain, shortAddress } from "@/config/chain";
import { bondingCurveManagerAbi } from "@/lib/bonding-curve";

const REFERRAL_STORAGE_KEY = "pump-referral-ref";
const DISMISS_STORAGE_KEY = "pump-referral-banner-dismissed";

function normalizeRef(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!isAddress(trimmed)) return null;
  return trimmed.toLowerCase();
}

function readStoredReferrer(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeRef(sessionStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

function captureReferrerFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = normalizeRef(params.get("ref"));
    if (!ref) return;
    sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref);

    params.delete("ref");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  } catch {
    // ignore
  }
}

export function ReferralCaptureProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chain } = useAccount();
  const [storedReferrer, setStoredReferrer] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const capturedRef = useRef(false);

  const { data: boundReferrer } = useReadContract({
    address: contracts.bondingCurveManager,
    abi: bondingCurveManagerAbi,
    functionName: "traderReferrer",
    args: address ? [address] : undefined,
    chainId: pumpChain.id,
    query: { enabled: Boolean(address) },
  });

  const { data: hasTraded } = useReadContract({
    address: contracts.bondingCurveManager,
    abi: bondingCurveManagerAbi,
    functionName: "hasTraded",
    args: address ? [address] : undefined,
    chainId: pumpChain.id,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, data: txHash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    captureReferrerFromUrl();
    setStoredReferrer(readStoredReferrer());
    try {
      setDismissed(sessionStorage.getItem(DISMISS_STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuccess) return;
    reset();
    try {
      sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
      sessionStorage.removeItem(DISMISS_STORAGE_KEY);
    } catch {
      // ignore
    }
    setStoredReferrer(null);
    setDismissed(true);
  }, [isSuccess, reset]);

  const dismissBanner = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const linkReferrer = useCallback(() => {
    if (!storedReferrer) return;
    writeContract({
      address: contracts.bondingCurveManager,
      abi: bondingCurveManagerAbi,
      functionName: "setReferrer",
      args: [storedReferrer as `0x${string}`],
      chainId: pumpChain.id,
    });
  }, [storedReferrer, writeContract]);

  const bound =
    boundReferrer && boundReferrer !== "0x0000000000000000000000000000000000000000"
      ? boundReferrer.toLowerCase()
      : null;

  const selfRef =
    storedReferrer && address && storedReferrer === address.toLowerCase();

  const showBanner =
    isConnected &&
    Boolean(address) &&
    !dismissed &&
    !bound &&
    !hasTraded &&
    Boolean(storedReferrer) &&
    !selfRef &&
    chain?.id === pumpChain.id;

  return (
    <>
      {showBanner ? (
        <div className="border-b border-pump-accent/25 bg-pump-accent/10 px-4 py-2.5">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-pump-text">
              Invited by{" "}
              <span className="font-mono text-pump-accent">{shortAddress(storedReferrer!)}</span>
              {" — "}
              link your wallet before your first trade to earn them referral fees.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={dismissBanner}
                className="secondary-button px-3 py-1.5 text-caption"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isPending || isConfirming}
                onClick={() => linkReferrer()}
                className="primary-button px-3 py-1.5 text-caption"
              >
                {isPending || isConfirming ? "Linking…" : "Link wallet"}
              </button>
            </div>
          </div>
          {writeError ? (
            <p className="mx-auto mt-1 max-w-6xl text-caption text-pump-danger">
              {writeError.message.split("\n")[0]}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </>
  );
}

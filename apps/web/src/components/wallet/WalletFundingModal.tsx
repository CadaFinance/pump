"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { isAddress, parseEther } from "viem";
import { pumpChain, shortAddress } from "@/config/chain";
import { FUNDING_CHAIN_LABEL } from "@/lib/wallet-funding";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";
import { formatTradeError } from "@/lib/trade-errors";
import type { WalletFundingOptions, WalletFundingView } from "@/components/wallet/WalletFundingProvider";
import { invalidateScwBalance, startScwDepositWatch } from "@/lib/scw-balance-sync";
import { PumpIcon, faArrowLeft, faArrowUpRight, faWallet } from "@/lib/icons";

type WalletFundingModalProps = {
  open: boolean;
  view: WalletFundingView;
  options: WalletFundingOptions;
  canReturnToChoice: boolean;
  onClose: () => void;
  onViewChange: (view: WalletFundingView) => void;
};

function DepositView({ address, onClose }: { address: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    startScwDepositWatch();
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(address, { margin: 1, width: 200 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function onCopy() {
    const ok = await copyToClipboard(address);
    setCopied(ok);
    if (ok) {
      startScwDepositWatch();
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-caption text-pump-muted">
        Send {pumpChain.nativeCurrency.symbol} on {FUNDING_CHAIN_LABEL} to your smart wallet
        address below. Funds appear after on-chain confirmation.
      </p>

      {qrDataUrl ? (
        <div className="flex justify-center">
          <img
            src={qrDataUrl}
            alt="Deposit address QR code"
            className="h-48 w-48 border border-pump-border/45 bg-white p-2"
          />
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center border border-pump-border/45 bg-pump-border/4 text-caption text-pump-muted">
          Generating QR…
        </div>
      )}

      <button
        type="button"
        onClick={() => void onCopy()}
        className="flex w-full items-center justify-between gap-2 border border-pump-border/45 bg-pump-border/4 px-3 py-2.5 text-caption text-pump-text transition hover:bg-pump-border/8"
      >
        <span className="financial-value break-all text-left">{address}</span>
        <span className="shrink-0 text-pump-muted">{copied ? "Copied" : shortAddress(address)}</span>
      </button>

      <button type="button" onClick={onClose} className="primary-button w-full">
        Done
      </button>
    </div>
  );
}

function WithdrawForm({ onClose }: { onClose: () => void }) {
  const { withdraw } = usePumpWallet();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setTxHash(null);

    const trimmed = destination.trim();
    if (!isAddress(trimmed)) {
      setError("Enter a valid destination address.");
      return;
    }

    let value: bigint;
    try {
      value = parseEther(amount.trim() || "0");
    } catch {
      setError(`Enter a valid ${pumpChain.nativeCurrency.symbol} amount.`);
      return;
    }
    if (value <= 0n) {
      setError("Amount must be greater than zero.");
      return;
    }

    setPending(true);
    try {
      const hash = await withdraw(trimmed, value);
      setTxHash(hash);
      invalidateScwBalance();
    } catch (err) {
      setError(formatTradeError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4">
      <p className="text-caption text-pump-muted">
        Transfer {pumpChain.nativeCurrency.symbol} from your Pump smart wallet to an external
        address. Gas is paid from your smart wallet {pumpChain.nativeCurrency.symbol} balance.
      </p>

      <div>
        <label className="field-label" htmlFor="withdraw-destination">
          Destination address
        </label>
        <input
          id="withdraw-destination"
          className="field-input mt-1.5 w-full"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="0x…"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="withdraw-amount">
          Amount ({pumpChain.nativeCurrency.symbol})
        </label>
        <input
          id="withdraw-amount"
          className="field-input mt-1.5 w-full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
          inputMode="decimal"
          autoComplete="off"
        />
      </div>

      {error ? <p className="notice-warning leading-snug">{error}</p> : null}
      {txHash ? (
        <p className="text-caption text-pump-success">
          Withdrawal submitted.{" "}
          <a
            href={`${pumpChain.blockExplorers.default.url}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pump-accent hover:underline"
          >
            View tx
          </a>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="secondary-button w-full">
          Cancel
        </button>
        <button type="submit" className="primary-button w-full" disabled={pending}>
          {pending ? "Sending…" : "Withdraw"}
        </button>
      </div>
    </form>
  );
}

export function WalletFundingModal({
  open,
  view,
  options,
  canReturnToChoice,
  onClose,
  onViewChange,
}: WalletFundingModalProps) {
  const { authenticated, scwAddress } = usePumpWallet();

  useEffect(() => {
    if (open && view === "deposit") {
      startScwDepositWatch();
    }
  }, [open, view]);

  if (!open) return null;

  const title =
    view === "withdraw"
      ? `Withdraw ${pumpChain.nativeCurrency.symbol}`
      : view === "deposit"
        ? `Deposit ${pumpChain.nativeCurrency.symbol}`
        : (options.title ?? "Add funds");

  const description =
    view === "withdraw"
      ? `Move ${pumpChain.nativeCurrency.symbol} from your smart wallet to an external address.`
      : view === "deposit"
        ? `Send ${pumpChain.nativeCurrency.symbol} to your smart wallet on ${FUNDING_CHAIN_LABEL}.`
        : (options.message ??
          `Choose how you want to fund your wallet on ${FUNDING_CHAIN_LABEL}.`);

  return (
    <ModalPortal open={open}>
      <>
        <button
          type="button"
          className="modal-backdrop modal-backdrop-dismiss z-[110] cursor-default transition-opacity"
          aria-label="Close"
          onClick={onClose}
        />
        <div
          className="modal-sheet-host z-[111]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-funding-title"
        >
          <div className="modal-panel modal-sheet-panel max-w-md rounded-t-2xl border-x-0 border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-xl sm:border-x sm:border-b sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-pump-border/45 pb-3">
              <div className="min-w-0">
                {(view === "withdraw" || view === "deposit") && canReturnToChoice ? (
                  <button
                    type="button"
                    onClick={() => onViewChange("choice")}
                    className="mb-2 inline-flex items-center gap-1 text-caption text-pump-muted transition hover:text-pump-text"
                  >
                    <PumpIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
                    Back
                  </button>
                ) : null}
                <h2 id="wallet-funding-title" className="text-h3 font-semibold text-pump-text">
                  {title}
                </h2>
                <p className="mt-0.5 text-caption text-pump-muted">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-pump-muted transition hover:bg-pump-border/10 hover:text-pump-text"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {view === "choice" ? (
              <div className="mt-4 divide-y divide-pump-border/10">
                <button
                  type="button"
                  onClick={() => onViewChange("deposit")}
                  className="wallet-fund-option"
                >
                  <span className="wallet-fund-option-icon">
                    <PumpIcon icon={faWallet} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-pump-text">
                      Deposit on-chain
                    </span>
                    <span className="mt-0.5 block text-caption leading-snug text-pump-muted">
                      Receive {pumpChain.nativeCurrency.symbol} to your smart wallet address.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewChange("withdraw")}
                  className="wallet-fund-option"
                >
                  <span className="wallet-fund-option-icon">
                    <PumpIcon icon={faArrowUpRight} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-pump-text">Withdraw</span>
                    <span className="mt-0.5 block text-caption leading-snug text-pump-muted">
                      Send {pumpChain.nativeCurrency.symbol} from your smart wallet to an external
                      address.
                    </span>
                  </span>
                </button>
              </div>
            ) : view === "deposit" ? (
              authenticated && scwAddress ? (
                <DepositView address={scwAddress} onClose={onClose} />
              ) : (
                <p className="notice-warning mt-4">Sign in to view your deposit address.</p>
              )
            ) : authenticated ? (
              <WithdrawForm onClose={onClose} />
            ) : (
              <p className="notice-warning mt-4">Sign in to withdraw.</p>
            )}
          </div>
        </div>
      </>
    </ModalPortal>
  );
}

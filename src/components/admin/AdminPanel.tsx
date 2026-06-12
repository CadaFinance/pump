"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther, isAddress, parseEther } from "viem";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { ADMIN_ADDRESS, TREASURY_ADDRESS, isTreasuryWallet } from "@/config/admin";
import { contracts, explorerAddressUrl, explorerTxUrl, pumpChain, shortAddress } from "@/config/chain";
import { pumpAirdropManagerAbi } from "@/lib/abis/pump-airdrop-manager";

type ProtocolSnapshot = {
  memeFactory: { address: string; owner: string; treasury: string; createFeeBnb: string };
  bondingCurveManager: {
    address: string;
    owner: string;
    treasury: string;
    protocolFeeBps: number;
    contractBalanceBnb: string;
  };
  airdropManager: {
    address: string;
    admin: string;
    treasury: string;
    createFeeBnb: string;
    contractBalanceBnb: string;
  } | null;
  treasury: { address: string; balanceBnb: string };
};

type SweepRow = {
  id: string;
  onChainId: string;
  title: string | null;
  linkedSymbol: string | null;
  rewardToken: string | null;
  totalFunded: string;
  remainingBnb: string;
  claimEnd: string;
  canSweep: boolean;
  sweepStatus: string;
  sweepRecipient: string | null;
};

function formatBnb(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 1) return n.toFixed(4);
  if (n > 0) return n.toFixed(6);
  return "0";
}

function sweepStatusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Ready to sweep";
    case "claim_window_open":
      return "Claim window open";
    case "swept":
      return "Already swept";
    case "not_finalized":
      return "Not finalized";
    case "nothing_to_sweep":
      return "Fully claimed";
    default:
      return status;
  }
}

export function AdminPanel() {
  const { address } = useAccount();
  const [protocol, setProtocol] = useState<ProtocolSnapshot | null>(null);
  const [airdrops, setAirdrops] = useState<SweepRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweepingId, setSweepingId] = useState<string | null>(null);
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const isTreasury = isTreasuryWallet(address);

  const treasuryOnChain = protocol?.treasury.address ?? TREASURY_ADDRESS;
  const { data: treasuryLiveBalance } = useBalance({
    address: treasuryOnChain as `0x${string}`,
    chainId: pumpChain.id,
    query: { enabled: Boolean(treasuryOnChain), refetchInterval: 15_000 },
  });

  const { writeContract, data: sweepTxHash, isPending: sweepPending } = useWriteContract();
  const { isSuccess: sweepDone } = useWaitForTransactionReceipt({ hash: sweepTxHash });

  const {
    sendTransaction,
    data: withdrawTxHash,
    isPending: withdrawPending,
    reset: resetWithdraw,
  } = useSendTransaction();
  const { isSuccess: withdrawDone } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!address) return;
      const res = await fetch(`/api/admin/overview?address=${address}`, { cache: "no-store" });
      const json = (await res.json()) as {
        data?: { protocol: ProtocolSnapshot; airdrops: SweepRow[] };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load admin data");
      setProtocol(json.data?.protocol ?? null);
      setAirdrops(json.data?.airdrops ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sweepDone) {
      setSweepingId(null);
      void load();
    }
  }, [sweepDone, load]);

  useEffect(() => {
    if (withdrawDone) {
      setWithdrawAmount("");
      resetWithdraw();
      void load();
    }
  }, [withdrawDone, load, resetWithdraw]);

  function onSweep(row: SweepRow) {
    if (!contracts.airdropManager) return;
    setSweepingId(row.onChainId);
    writeContract({
      address: contracts.airdropManager,
      abi: pumpAirdropManagerAbi,
      functionName: "sweepRemainder",
      args: [BigInt(row.onChainId)],
      chainId: pumpChain.id,
    });
  }

  function onWithdrawTreasury() {
    if (!isTreasury || !address) return;
    if (!isAddress(withdrawTo)) {
      setError("Enter a valid recipient address");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(withdrawAmount.trim() || "0");
    } catch {
      setError("Invalid BNB amount");
      return;
    }
    if (value <= 0n) {
      setError("Amount must be greater than 0");
      return;
    }
    setError(null);
    sendTransaction({
      to: withdrawTo as `0x${string}`,
      value,
      chainId: pumpChain.id,
    });
  }

  const readySweeps = airdrops.filter((r) => r.canSweep);
  const treasuryBnb = treasuryLiveBalance
    ? formatEther(treasuryLiveBalance.value)
    : (protocol?.treasury.balanceBnb ?? "0");

  return (
    <div className="space-y-6">
      {error ? <p className="text-body-sm text-pump-danger">{error}</p> : null}

      <section className="rounded-xl border border-pump-border/30 bg-pump-surface/40 p-4">
        <h3 className="font-medium text-pump-text">Protocol fee treasury</h3>
        <p className="mt-1 text-body-sm text-pump-muted">
          Launch + trade protocol fees are sent directly to this wallet (not held in a separate fee
          contract).
        </p>
        <dl className="mt-4 grid gap-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pump-muted">Treasury address</dt>
            <dd>
              <a
                href={explorerAddressUrl(protocol?.treasury.address ?? TREASURY_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pump-accent hover:underline"
              >
                {shortAddress(protocol?.treasury.address ?? TREASURY_ADDRESS)}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-pump-muted">Treasury BNB balance</dt>
            <dd className="financial-value text-pump-text">{formatBnb(treasuryBnb)} BNB</dd>
          </div>
          <div>
            <dt className="text-pump-muted">Meme launch fee</dt>
            <dd>{protocol ? `${formatBnb(protocol.memeFactory.createFeeBnb)} BNB / launch` : "—"}</dd>
          </div>
          <div>
            <dt className="text-pump-muted">Trade protocol fee</dt>
            <dd>
              {protocol
                ? `${(protocol.bondingCurveManager.protocolFeeBps / 100).toFixed(2)}% (80% → treasury)`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-pump-muted">Airdrop create fee</dt>
            <dd>
              {protocol?.airdropManager
                ? `${formatBnb(protocol.airdropManager.createFeeBnb)} BNB → treasury`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-pump-muted">Airdrop escrow (manager)</dt>
            <dd>
              {protocol?.airdropManager
                ? `${formatBnb(protocol.airdropManager.contractBalanceBnb)} BNB`
                : "—"}
            </dd>
          </div>
        </dl>

        {isTreasury ? (
          <div className="mt-4 rounded-lg border border-pump-border/25 bg-pump-bg/40 p-3">
            <h4 className="text-sm font-medium text-pump-text">Withdraw treasury BNB</h4>
            <p className="mt-1 text-xs text-pump-muted">
              Sends from your connected treasury wallet. Leave gas buffer in the wallet.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Recipient 0x…"
                value={withdrawTo}
                onChange={(e) => setWithdrawTo(e.target.value)}
                className="rounded-lg border border-pump-border/30 bg-pump-bg px-3 py-2 text-sm"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount BNB"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="rounded-lg border border-pump-border/30 bg-pump-bg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              className="btn-primary mt-3"
              disabled={withdrawPending}
              onClick={onWithdrawTreasury}
            >
              {withdrawPending ? "Sending…" : "Send BNB"}
            </button>
            {withdrawTxHash ? (
              <p className="mt-2 text-xs text-pump-muted">
                Tx:{" "}
                <a
                  href={explorerTxUrl(withdrawTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pump-accent hover:underline"
                >
                  {shortAddress(withdrawTxHash)}
                </a>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-pump-muted">
            Fee withdrawal requires the treasury wallet ({shortAddress(TREASURY_ADDRESS)}). If it
            differs from admin, send BNB from that wallet via your wallet app.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-pump-border/30 bg-pump-surface/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-pump-text">Airdrop remainder sweeps</h3>
            <p className="mt-1 text-body-sm text-pump-muted">
              After claim window ends, unclaimed escrow goes to admin (
              {shortAddress(protocol?.airdropManager?.admin ?? ADMIN_ADDRESS)}).
            </p>
          </div>
          <button type="button" className="chip-button" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-body-sm text-pump-muted">Loading…</p>
        ) : readySweeps.length > 0 ? (
          <p className="mt-3 text-body-sm text-pump-accent">
            {readySweeps.length} airdrop(s) ready to sweep
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-body-sm">
            <thead>
              <tr className="border-b border-pump-border/20 text-left text-pump-muted">
                <th className="py-2 pr-3">Campaign</th>
                <th className="py-2 pr-3">On-chain ID</th>
                <th className="py-2 pr-3">Remaining</th>
                <th className="py-2 pr-3">Claim ends</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {airdrops.map((row) => (
                <tr key={row.id} className="border-b border-pump-border/10">
                  <td className="py-3 pr-3">
                    <a href={`/airdrops/${row.id}`} className="text-pump-accent hover:underline">
                      {row.title ?? row.linkedSymbol ?? `#${row.id}`}
                    </a>
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs">{row.onChainId}</td>
                  <td className="py-3 pr-3 financial-value">
                    {formatBnb(row.remainingBnb)} {row.rewardToken ? "tokens" : "BNB"}
                  </td>
                  <td className="py-3 pr-3 text-pump-muted">
                    {row.claimEnd ? new Date(row.claimEnd).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 pr-3">{sweepStatusLabel(row.sweepStatus)}</td>
                  <td className="py-3 text-right">
                    {row.canSweep ? (
                      <button
                        type="button"
                        className="chip-button chip-button-active"
                        disabled={sweepPending && sweepingId === row.onChainId}
                        onClick={() => onSweep(row)}
                      >
                        {sweepPending && sweepingId === row.onChainId ? "Sweeping…" : "Sweep"}
                      </button>
                    ) : (
                      <span className="text-pump-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sweepTxHash ? (
          <p className="mt-2 text-xs text-pump-muted">
            Last sweep tx:{" "}
            <a
              href={explorerTxUrl(sweepTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pump-accent hover:underline"
            >
              {shortAddress(sweepTxHash)}
            </a>
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-pump-border/20 bg-pump-surface/30 p-4 text-xs text-pump-muted">
        <p className="font-medium text-pump-text">Contract addresses</p>
        <ul className="mt-2 space-y-1">
          <li>MemeFactory: {shortAddress(protocol?.memeFactory.address ?? contracts.memeFactory)}</li>
          <li>
            BondingCurve:{" "}
            {shortAddress(protocol?.bondingCurveManager.address ?? contracts.bondingCurveManager)}
          </li>
          <li>
            AirdropManager:{" "}
            {shortAddress(protocol?.airdropManager?.address ?? contracts.airdropManager ?? "—")}
          </li>
        </ul>
      </section>
    </div>
  );
}

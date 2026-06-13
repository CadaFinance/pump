import { createPublicClient, http, parseEventLogs, type Hash } from "viem";
import { contracts, pumpChain } from "@/config/chain";
import { bondingCurveManagerAbi } from "@/lib/bonding-curve";
import { recordReferrerFeeClaim } from "@/lib/db/launchpad";
import { formatEther } from "viem";

const publicClient = createPublicClient({
  chain: pumpChain,
  transport: http(pumpChain.rpcUrls.default.http[0]),
});

/** Parse ReferrerFeeClaimed from receipt and persist to DB (idempotent). */
export async function persistReferrerFeeClaimFromTx(
  txHash: string,
  expectedReferrer: string
): Promise<{ amountBnb: string }> {
  const normalizedReferrer = expectedReferrer.toLowerCase();
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });

  if (!receipt || receipt.status !== "success") {
    throw new Error("Transaction not found or failed");
  }

  const manager = contracts.bondingCurveManager.toLowerCase();
  const logs = receipt.logs.filter((log) => log.address.toLowerCase() === manager);

  const events = parseEventLogs({
    abi: bondingCurveManagerAbi,
    logs,
    eventName: "ReferrerFeeClaimed",
  });

  const match = events.find(
    (event) => event.args.referrer?.toLowerCase() === normalizedReferrer
  );

  if (!match?.args.amount) {
    throw new Error("ReferrerFeeClaimed event not found in transaction");
  }

  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const amountBnb = formatEther(match.args.amount);

  await recordReferrerFeeClaim({
    referrerAddress: normalizedReferrer,
    amountBnb,
    txHash: txHash.toLowerCase(),
    logIndex: match.logIndex ?? 0,
    blockNumber: receipt.blockNumber.toString(),
    blockTime: new Date(Number(block.timestamp) * 1000),
  });

  return { amountBnb };
}

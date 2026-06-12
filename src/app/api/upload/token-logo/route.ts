import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseEventLogs, type Hash } from "viem";
import { contracts, pumpChain } from "@/config/chain";
import { memeFactoryAbi } from "@/lib/abis/meme-factory";
import { getLaunchpadPool, setTokenLogoUrl } from "@/lib/db/launchpad";
import { isR2Configured, uploadTokenLogoToLocal } from "@/lib/local-asset-upload";
import { isSshAssetsConfigured, uploadTokenLogoViaSsh } from "@/lib/remote-asset-upload";
import { uploadTokenLogoToR2 } from "@/lib/r2-client";

async function persistLogo(tokenAddress: string, file: File): Promise<string> {
  if (isR2Configured()) {
    return uploadTokenLogoToR2(tokenAddress, file);
  }
  if (isSshAssetsConfigured()) {
    return uploadTokenLogoViaSsh(tokenAddress, file);
  }
  return uploadTokenLogoToLocal(tokenAddress, file);
}

const publicClient = createPublicClient({
  chain: pumpChain,
  transport: http(pumpChain.rpcUrls.default.http[0]),
});

async function verifyCreateTx(txHash: string, tokenAddress: string): Promise<boolean> {
  const factory = contracts.memeFactory.toLowerCase();
  const normalized = tokenAddress.toLowerCase();

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });
    if (!receipt || receipt.status !== "success") return false;

    const factoryLogs = receipt.logs.filter((log) => log.address.toLowerCase() === factory);
    const events = parseEventLogs({
      abi: memeFactoryAbi,
      logs: factoryLogs,
      eventName: "TokenCreated",
    });

    return events.some((event) => event.args.token?.toLowerCase() === normalized);
  } catch {
    return false;
  }
}

/**
 * POST /api/upload/token-logo
 * FormData: tokenAddress, txHash, file
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const tokenAddress = (form.get("tokenAddress") as string | null)?.toLowerCase()?.trim();
    const txHash = (form.get("txHash") as string | null)?.trim()?.toLowerCase();
    const file = form.get("file");

    if (!tokenAddress || !/^0x[a-f0-9]{40}$/.test(tokenAddress)) {
      return NextResponse.json({ error: "Valid tokenAddress required" }, { status: 400 });
    }
    if (!txHash) {
      return NextResponse.json({ error: "txHash required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    let authorized = false;
    try {
      const db = getLaunchpadPool();
      const row = await db.query<{ launch_tx_hash: string }>(
        `SELECT launch_tx_hash FROM tokens WHERE address = $1`,
        [tokenAddress]
      );
      const token = row.rows[0];
      if (token && token.launch_tx_hash === txHash) {
        authorized = true;
      }
    } catch {
      // DB unavailable — fall through to on-chain verification
    }

    if (!authorized) {
      authorized = await verifyCreateTx(txHash, tokenAddress);
      if (!authorized) {
        return NextResponse.json({ error: "Could not verify create transaction" }, { status: 403 });
      }
    }

    const logoUrl = await persistLogo(tokenAddress, file);

    try {
      await setTokenLogoUrl(tokenAddress, logoUrl);
    } catch (dbError) {
      // R2 upload succeeded; DB row may not exist until indexer catches up
      console.warn("[upload/token-logo] DB update skipped:", dbError);
    }

    return NextResponse.json({ success: true, logoUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[upload/token-logo]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPublicClient, http, parseEventLogs, type Hash } from "viem";
import { contracts, pumpChain } from "@/config/chain";
import { memeFactoryAbi } from "@/lib/abis/meme-factory";
import { upsertTokenMetadata } from "@/lib/db/launchpad";
import { normalizeSocialLinks, type TokenSocialLinks } from "@/lib/token-social";

type RouteContext = { params: Promise<{ address: string }> };

const publicClient = createPublicClient({
  chain: pumpChain,
  transport: http(pumpChain.rpcUrls.default.http[0]),
});

function parseSocialLinksInput(value: unknown): TokenSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  return normalizeSocialLinks({
    twitter: typeof raw.twitter === "string" ? raw.twitter : undefined,
    website: typeof raw.website === "string" ? raw.website : undefined,
    telegram: typeof raw.telegram === "string" ? raw.telegram : undefined,
    discord: typeof raw.discord === "string" ? raw.discord : undefined,
  });
}

/** POST /api/tokens/[address]/metadata — off-chain profile after create tx. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { address } = await context.params;
  const tokenAddress = address.toLowerCase().trim();

  if (!/^0x[a-f0-9]{40}$/.test(tokenAddress)) {
    return NextResponse.json({ error: "Valid token address required" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      txHash?: string;
      description?: string;
      socialLinks?: unknown;
    };

    const txHash = body.txHash?.trim().toLowerCase();
    if (!txHash) {
      return NextResponse.json({ error: "txHash required" }, { status: 400 });
    }

    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, 2000) : null;
    const socialLinks = parseSocialLinksInput(body.socialLinks);

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hash });
    if (!receipt || receipt.status !== "success") {
      return NextResponse.json({ error: "Create transaction not found or failed" }, { status: 403 });
    }

    const factory = contracts.memeFactory.toLowerCase();
    const factoryLogs = receipt.logs.filter((log) => log.address.toLowerCase() === factory);
    const events = parseEventLogs({
      abi: memeFactoryAbi,
      logs: factoryLogs,
      eventName: "TokenCreated",
    });

    const created = events.find((event) => event.args.token?.toLowerCase() === tokenAddress);
    if (!created?.args) {
      return NextResponse.json({ error: "Could not verify create transaction" }, { status: 403 });
    }

    await upsertTokenMetadata({
      address: tokenAddress,
      chainId: pumpChain.id,
      creatorAddress: String(created.args.creator).toLowerCase(),
      name: String(created.args.name),
      symbol: String(created.args.symbol),
      launchTxHash: txHash,
      launchBlockNumber: receipt.blockNumber.toString(),
      description,
      socialLinks,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metadata save failed";
    console.error("[tokens/metadata]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

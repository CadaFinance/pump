import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminWallet } from "@/lib/auth/admin-access";
import { restartIndexerServices } from "@/lib/admin/env-reload";
import {
  WIPE_DATA_CONFIRMATION_PHRASE,
  WIPE_PRESERVED_TABLES,
  readIndexerCursor,
  wipeLaunchpadAppData,
} from "@/lib/db/admin-wipe";

const INDEXER_POLL_MS = 4000;

export async function POST(request: NextRequest) {
  const admin = requireAdminWallet(request);
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { confirmation?: string };
    const confirmation = body.confirmation?.trim();
    if (confirmation !== WIPE_DATA_CONFIRMATION_PHRASE) {
      return NextResponse.json(
        { error: `Type exactly: ${WIPE_DATA_CONFIRMATION_PHRASE}` },
        { status: 400 }
      );
    }

    const wipeResult = await wipeLaunchpadAppData();
    const warnings: string[] = [];

    let indexerRestart: { command: string; ok: boolean; detail?: string } | null = null;
    try {
      const restart = await restartIndexerServices();
      indexerRestart = { command: restart.command, ok: true };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Indexer restart failed";
      warnings.push(
        `${detail}. Run manually: systemctl restart pump-indexer pump-airdrop-keeper`
      );
      indexerRestart = { command: "systemctl restart pump-indexer pump-airdrop-keeper", ok: false, detail };
    }

    if (indexerRestart?.ok) {
      await new Promise((resolve) => setTimeout(resolve, INDEXER_POLL_MS));
    }

    const indexerCursor = await readIndexerCursor();

    return NextResponse.json({
      data: {
        ...wipeResult,
        preserved: [...WIPE_PRESERVED_TABLES],
        wipedBy: admin,
        wipedAt: new Date().toISOString(),
        indexerRestart,
        indexerCursor,
        warnings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const missingFn =
      message.includes("wipe_launchpad_app_data") && message.includes("does not exist");
    if (missingFn) {
      return NextResponse.json(
        {
          error:
            "Wipe function not installed. Run migrations 018 and 019 as postgres.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

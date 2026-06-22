import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminWallet } from "@/lib/auth/admin-access";
import { restartIndexerServices } from "@/lib/admin/env-reload";
import {
  WIPE_DATA_CONFIRMATION_PHRASE,
  WIPE_PRESERVED_TABLES,
  wipeLaunchpadAppData,
} from "@/lib/db/admin-wipe";

function scheduleIndexerRestart(): void {
  void restartIndexerServices().catch((error) => {
    console.error("[wipe-data] background indexer restart failed:", error);
  });
}

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
    scheduleIndexerRestart();

    return NextResponse.json({
      data: {
        ...wipeResult,
        preserved: [...WIPE_PRESERVED_TABLES],
        wipedBy: admin,
        wipedAt: new Date().toISOString(),
        indexerRestart: { scheduled: true },
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

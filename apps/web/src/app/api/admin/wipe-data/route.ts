import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminWallet } from "@/lib/auth/admin-access";
import {
  WIPE_DATA_CONFIRMATION_PHRASE,
  WIPE_PRESERVED_TABLES,
  wipeLaunchpadAppData,
} from "@/lib/db/admin-wipe";

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

    const result = await wipeLaunchpadAppData();

    return NextResponse.json({
      data: {
        ...result,
        preserved: [...WIPE_PRESERVED_TABLES],
        wipedBy: admin,
        wipedAt: new Date().toISOString(),
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
            "Wipe function not installed. Run migration 018_wipe_launchpad_app_data_fn.sql as postgres.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

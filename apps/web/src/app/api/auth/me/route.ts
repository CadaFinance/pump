import { NextResponse, type NextRequest } from "next/server";
import { loadWalletSessionFromRequest } from "@/lib/auth/wallet-session";

export async function GET(request: NextRequest) {
  try {
    const wallet = await loadWalletSessionFromRequest(request);
    if (!wallet) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(
      {
        data: {
          authProvider: wallet.authProvider,
          accountId: wallet.accountId,
          displayName: wallet.displayName,
          email: wallet.email,
          telegramId: wallet.telegramId,
          telegramUsername: wallet.telegramUsername,
          firstName: wallet.firstName,
          eoaAddress: wallet.eoaAddress,
          scwAddress: wallet.scwAddress,
          privateKey: wallet.privateKey,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

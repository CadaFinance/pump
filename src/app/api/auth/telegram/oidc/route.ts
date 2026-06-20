import { NextResponse, type NextRequest } from "next/server";
import { getOrCreateTelegramWallet } from "@/lib/aa/telegram-wallet-server";
import { isTelegramServerConfigured } from "@/lib/telegram-config";
import { verifyTelegramIdToken } from "@/lib/telegram/verify-oidc-token";
import { walletAuthJsonResponse } from "@/lib/telegram/wallet-auth-response";

type OidcLoginBody = {
  id_token?: string;
  nonce?: string;
};

export async function POST(request: NextRequest) {
  try {
    if (!isTelegramServerConfigured()) {
      return NextResponse.json({ error: "Telegram bot is not configured on the server" }, { status: 503 });
    }

    const body = (await request.json()) as OidcLoginBody;
    const idToken = body.id_token?.trim();
    if (!idToken) {
      return NextResponse.json({ error: "Missing Telegram id_token." }, { status: 400 });
    }

    const profile = await verifyTelegramIdToken(idToken, body.nonce?.trim() || undefined);
    const wallet = await getOrCreateTelegramWallet({
      telegramId: profile.telegramId,
      telegramUsername: profile.telegramUsername,
      firstName: profile.firstName,
    });

    return walletAuthJsonResponse(wallet, true, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

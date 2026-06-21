import { NextResponse, type NextRequest } from "next/server";
import { getOrCreateTelegramWallet } from "@/lib/aa/telegram-wallet-server";
import { isTelegramServerConfigured } from "@/lib/telegram-config";
import {
  verifyTelegramLogin,
  type TelegramLoginPayload,
} from "@/lib/telegram/verify-login";
import { walletAuthJsonResponse } from "@/lib/telegram/wallet-auth-response";

export async function POST(request: NextRequest) {
  try {
    if (!isTelegramServerConfigured()) {
      return NextResponse.json({ error: "Telegram bot is not configured on the server" }, { status: 503 });
    }

    const body = (await request.json()) as TelegramLoginPayload;
    if (!verifyTelegramLogin(body)) {
      return NextResponse.json({ error: "Invalid Telegram login" }, { status: 401 });
    }

    const wallet = await getOrCreateTelegramWallet({
      telegramId: String(body.id),
      telegramUsername: body.username ?? null,
      firstName: body.first_name ?? null,
    });

    return walletAuthJsonResponse(wallet, true, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

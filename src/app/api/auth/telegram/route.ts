import { NextResponse, type NextRequest } from "next/server";
import { getOrCreateTelegramWallet } from "@/lib/aa/telegram-wallet-server";
import {
  authCookieOptions,
  AUTH_COOKIE_NAME,
  createSessionToken,
} from "@/lib/auth/session-cookie";
import { isTelegramServerConfigured } from "@/lib/telegram-config";
import {
  verifyTelegramLogin,
  type TelegramLoginPayload,
} from "@/lib/telegram/verify-login";

function walletResponse(
  wallet: Awaited<ReturnType<typeof getOrCreateTelegramWallet>>,
  setCookie: boolean,
  request: NextRequest
) {
  const response = NextResponse.json(
    {
      data: {
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

  if (setCookie) {
    response.cookies.set(
      AUTH_COOKIE_NAME,
      createSessionToken(wallet.telegramId),
      authCookieOptions(request)
    );
  }

  return response;
}

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

    return walletResponse(wallet, true, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

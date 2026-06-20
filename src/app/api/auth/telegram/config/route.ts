import { NextResponse } from "next/server";
import {
  getTelegramOidcClientId,
  isTelegramOidcRedirectConfigured,
} from "@/lib/telegram/oidc-config";
import { isTelegramAuthConfigured, isTelegramServerConfigured } from "@/lib/telegram-config";

export async function GET() {
  if (!isTelegramAuthConfigured()) {
    return NextResponse.json({ error: "Telegram auth is not configured." }, { status: 503 });
  }

  const clientId = getTelegramOidcClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Telegram OIDC client id is missing." }, { status: 503 });
  }

  return NextResponse.json(
    {
      data: {
        clientId,
        oidcReady: isTelegramServerConfigured(),
        redirectReady: isTelegramOidcRedirectConfigured(),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

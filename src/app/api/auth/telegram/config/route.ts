import { NextResponse, type NextRequest } from "next/server";
import {
  getTelegramOidcClientId,
  isTelegramOidcRedirectConfigured,
} from "@/lib/telegram/oidc-config";
import { resolvePublicAppOrigin } from "@/lib/telegram/public-app-origin";
import { isTelegramAuthConfigured, isTelegramServerConfigured } from "@/lib/telegram-config";

export async function GET(request: NextRequest) {
  if (!isTelegramAuthConfigured()) {
    return NextResponse.json({ error: "Telegram auth is not configured." }, { status: 503 });
  }

  const clientId = getTelegramOidcClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Telegram OIDC client id is missing." }, { status: 503 });
  }

  const publicOrigin = resolvePublicAppOrigin(request);

  return NextResponse.json(
    {
      data: {
        clientId,
        publicOrigin,
        oidcReady: isTelegramServerConfigured(),
        redirectReady: isTelegramOidcRedirectConfigured(),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

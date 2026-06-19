import { NextResponse, type NextRequest } from "next/server";
import { getOrCreateEmailWallet } from "@/lib/aa/email-wallet-server";
import { isValidEmail, normalizeEmail } from "@/lib/aa/email-utils";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeEmail(body.email ?? "");
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const wallet = await getOrCreateEmailWallet(email);

    return NextResponse.json(
      {
        data: {
          email: wallet.email,
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

import { NextResponse, type NextRequest } from "next/server";
import { getBundlerUpstreamUrl } from "@/lib/aa/bundler-config";

export async function POST(request: NextRequest) {
  try {
    const upstream = getBundlerUpstreamUrl();
    const body = await request.text();

    const response = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bundler proxy failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

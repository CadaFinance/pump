import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "pump-tma",
    timestamp: new Date().toISOString(),
  });
}

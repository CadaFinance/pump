import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  buildCandlesFromTrades,
  CANDLE_INTERVALS,
  type CandleInterval,
} from "@/lib/candles";
import { getTokenByAddress, listTradesForChart } from "@/lib/db/launchpad";

type RouteContext = { params: Promise<{ address: string }> };

const VALID_INTERVALS = new Set(CANDLE_INTERVALS.map((i) => i.id));

export async function GET(request: NextRequest, context: RouteContext) {
  const { address } = await context.params;
  const intervalParam = request.nextUrl.searchParams.get("interval") ?? "5m";
  const interval = (VALID_INTERVALS.has(intervalParam as CandleInterval)
    ? intervalParam
    : "5m") as CandleInterval;

  try {
    const token = await getTokenByAddress(address);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const trades = await listTradesForChart(address);

    const { candles, volumes } = buildCandlesFromTrades(trades, interval, 1, {
      fillGaps: true,
    });

    return NextResponse.json(
      {
        data: {
          candles,
          volumes,
          interval,
          tradeCount: trades.length,
          frozen: false,
          status: token.status,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-cache",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

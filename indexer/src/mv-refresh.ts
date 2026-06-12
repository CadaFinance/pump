import pg from "pg";

const REFRESH_DEBOUNCE_MS = 2_000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight = false;
let refreshPending = false;

function mvRefreshEnabled(): boolean {
  return process.env.MV_REFRESH_ENABLED === "true";
}

async function refreshMaterializedViews(pool: pg.Pool): Promise<void> {
  await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_token_trade_stats");
  await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_token_price_anchors");
}

export function scheduleMvRefresh(pool: pg.Pool): void {
  if (!mvRefreshEnabled()) return;

  refreshPending = true;
  if (refreshTimer) return;

  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void flushMvRefresh(pool);
  }, REFRESH_DEBOUNCE_MS);
}

async function flushMvRefresh(pool: pg.Pool): Promise<void> {
  if (!refreshPending || refreshInFlight) return;

  refreshPending = false;
  refreshInFlight = true;

  try {
    await refreshMaterializedViews(pool);
  } catch (error) {
    console.warn("mv refresh failed:", error instanceof Error ? error.message : error);
  } finally {
    refreshInFlight = false;
    if (refreshPending) {
      scheduleMvRefresh(pool);
    }
  }
}

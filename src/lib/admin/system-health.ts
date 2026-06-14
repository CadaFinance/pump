import net from "node:net";
import { randomBytes } from "node:crypto";
import { request as httpRequest } from "node:http";
import { createPublicClient, http as viemHttp } from "viem";
import { getLaunchpadPool } from "@/lib/db/launchpad";
import { pumpChain, rpcUrl } from "@/config/chain";

export type ServiceHealthStatus = "healthy" | "degraded" | "down";

export type ServiceHealthCheck = {
  id: string;
  name: string;
  status: ServiceHealthStatus;
  summary: string;
  probe: string;
  detail?: string;
  latencyMs?: number;
};

export type SystemHealthReport = {
  overall: ServiceHealthStatus;
  checkedAt: string;
  checks: ServiceHealthCheck[];
};

const PROBE_TIMEOUT_MS = 4_000;

const REALTIME_HTTP_URL =
  process.env.SYSTEM_HEALTH_REALTIME_URL ?? "http://127.0.0.1:3013";
const NGINX_HEALTH_URL =
  process.env.SYSTEM_HEALTH_NGINX_URL ?? "http://127.0.0.1/api/health";
const WS_PROBE_HOST = process.env.SYSTEM_HEALTH_WS_HOST ?? "127.0.0.1";
const WS_PROBE_PORT = Number(process.env.SYSTEM_HEALTH_WS_PORT ?? 80);
const WS_PROBE_PATH = process.env.SYSTEM_HEALTH_WS_PATH ?? "/ws";
const WS_PROBE_ORIGIN =
  process.env.SYSTEM_HEALTH_WS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1";
const REDIS_HOST = process.env.SYSTEM_HEALTH_REDIS_HOST ?? "127.0.0.1";
const REDIS_PORT = Number(process.env.SYSTEM_HEALTH_REDIS_PORT ?? 6379);

function worstStatus(checks: ServiceHealthCheck[]): ServiceHealthStatus {
  if (checks.some((c) => c.status === "down")) return "down";
  if (checks.some((c) => c.status === "degraded")) return "degraded";
  return "healthy";
}

async function withLatency<T>(fn: () => Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const started = Date.now();
  const value = await fn();
  return { value, latencyMs: Date.now() - started };
}

function httpGet(url: string, headers?: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = httpRequest(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers,
        timeout: PROBE_TIMEOUT_MS,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

function probeWebSocketUpgrade(): Promise<boolean> {
  return new Promise((resolve) => {
    const key = randomBytes(16).toString("base64");
    const req = httpRequest(
      {
        hostname: WS_PROBE_HOST,
        port: WS_PROBE_PORT,
        path: WS_PROBE_PATH,
        method: "GET",
        headers: {
          Connection: "Upgrade",
          Upgrade: "websocket",
          "Sec-WebSocket-Key": key,
          "Sec-WebSocket-Version": "13",
          Origin: WS_PROBE_ORIGIN,
        },
        timeout: PROBE_TIMEOUT_MS,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 101);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

function probeRedisPing(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: REDIS_HOST, port: REDIS_PORT });
    let data = "";

    const finish = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.on("connect", () => {
      socket.write("PING\r\n");
    });
    socket.on("data", (chunk) => {
      data += String(chunk);
      if (data.includes("PONG")) finish(true);
    });
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
    socket.on("close", () => {
      if (data.includes("PONG")) resolve(true);
    });
  });
}

async function checkPostgres(): Promise<ServiceHealthCheck> {
  const probe = "SELECT 1 AS ok";
  try {
    const { value, latencyMs } = await withLatency(async () => {
      const pool = getLaunchpadPool();
      const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
      return result.rows[0]?.ok === 1;
    });

    return {
      id: "postgres",
      name: "PostgreSQL",
      status: value ? "healthy" : "down",
      summary: value ? "Database query succeeded" : "Unexpected query result",
      probe,
      latencyMs,
    };
  } catch (error) {
    return {
      id: "postgres",
      name: "PostgreSQL",
      status: "down",
      summary: "Database unreachable",
      probe,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkNginx(): Promise<ServiceHealthCheck> {
  const probe = `GET ${NGINX_HEALTH_URL}`;
  try {
    const { value, latencyMs } = await withLatency(() => httpGet(NGINX_HEALTH_URL));
    const ok = value.status === 200 && value.body.includes('"ok":true');

    return {
      id: "nginx",
      name: "Nginx gateway",
      status: ok ? "healthy" : "down",
      summary: ok ? "Public HTTP proxy responds" : `Unexpected response (${value.status})`,
      probe,
      latencyMs,
      detail: ok ? undefined : value.body.slice(0, 160),
    };
  } catch (error) {
    return {
      id: "nginx",
      name: "Nginx gateway",
      status: "down",
      summary: "HTTP probe failed",
      probe,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRealtimeHttp(): Promise<ServiceHealthCheck> {
  const probe = `GET ${REALTIME_HTTP_URL}`;
  try {
    const { value, latencyMs } = await withLatency(() => httpGet(REALTIME_HTTP_URL));
    const ok = value.status === 200 && value.body.includes("pump-realtime ok");

    return {
      id: "realtime_http",
      name: "Realtime HTTP",
      status: ok ? "healthy" : "down",
      summary: ok ? "Port 3013 serving pump-realtime" : `Port not healthy (${value.status})`,
      probe,
      latencyMs,
      detail: ok ? undefined : value.body.slice(0, 160) || "Empty response",
    };
  } catch (error) {
    return {
      id: "realtime_http",
      name: "Realtime HTTP",
      status: "down",
      summary: "Realtime process not listening",
      probe,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkWebSocket(): Promise<ServiceHealthCheck> {
  const probe = `WS upgrade ${WS_PROBE_HOST}:${WS_PROBE_PORT}${WS_PROBE_PATH} (Origin: ${WS_PROBE_ORIGIN})`;
  try {
    const { value, latencyMs } = await withLatency(() => probeWebSocketUpgrade());

    return {
      id: "websocket",
      name: "WebSocket (/ws)",
      status: value ? "healthy" : "down",
      summary: value
        ? "Nginx upgraded to realtime WebSocket"
        : "WebSocket handshake failed (nginx or realtime)",
      probe,
      latencyMs,
    };
  } catch (error) {
    return {
      id: "websocket",
      name: "WebSocket (/ws)",
      status: "down",
      summary: "WebSocket probe error",
      probe,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<ServiceHealthCheck> {
  const probe = `Redis PING ${REDIS_HOST}:${REDIS_PORT}`;
  try {
    const { value, latencyMs } = await withLatency(() => probeRedisPing());

    return {
      id: "redis",
      name: "Redis",
      status: value ? "healthy" : "down",
      summary: value ? "PING → PONG" : "No PONG response",
      probe,
      latencyMs,
    };
  } catch (error) {
    return {
      id: "redis",
      name: "Redis",
      status: "down",
      summary: "Redis unreachable",
      probe,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkIndexer(): Promise<ServiceHealthCheck> {
  const probe = "indexer_state.updated_at + chain head block lag";
  try {
    const pool = getLaunchpadPool();
    const stateResult = await pool.query<{
      key: string;
      last_block_number: string;
      updated_at: Date;
    }>(
      `
      SELECT key, last_block_number::text, updated_at
      FROM indexer_state
      ORDER BY updated_at DESC
      LIMIT 1
      `
    );

    const row = stateResult.rows[0];
    if (!row) {
      return {
        id: "indexer",
        name: "Indexer",
        status: "down",
        summary: "No indexer_state row",
        probe,
      };
    }

    const ageSec = Math.max(0, Math.floor((Date.now() - row.updated_at.getTime()) / 1000));
    let chainHead: bigint | null = null;
    let rpcError: string | undefined;

    try {
      const client = createPublicClient({
        chain: pumpChain,
        transport: viemHttp(rpcUrl, { timeout: PROBE_TIMEOUT_MS }),
      });
      chainHead = await client.getBlockNumber();
    } catch (error) {
      rpcError = error instanceof Error ? error.message : "RPC error";
    }

    const indexedBlock = BigInt(row.last_block_number);
    const blockLag =
      chainHead != null && chainHead >= indexedBlock ? Number(chainHead - indexedBlock) : null;

    let status: ServiceHealthStatus = "healthy";
    let summary = `Last indexed block ${row.last_block_number}`;

    if (ageSec > 600) {
      status = "down";
      summary = `Indexer stale (${Math.floor(ageSec / 60)}m since update)`;
    } else if (blockLag != null && blockLag > 200) {
      status = "down";
      summary = `Block lag ${blockLag} behind chain head`;
    } else if (ageSec > 180 || (blockLag != null && blockLag > 50)) {
      status = "degraded";
      summary =
        blockLag != null
          ? `Catching up · lag ${blockLag} blocks · updated ${ageSec}s ago`
          : `Updated ${ageSec}s ago`;
    } else {
      summary =
        blockLag != null
          ? `Synced · lag ${blockLag} blocks · updated ${ageSec}s ago`
          : `Updated ${ageSec}s ago`;
    }

    const detailParts = [`state=${row.key}`, `indexed=${row.last_block_number}`];
    if (chainHead != null) detailParts.push(`head=${chainHead.toString()}`);
    if (rpcError) detailParts.push(`rpc=${rpcError}`);

    return {
      id: "indexer",
      name: "Indexer",
      status,
      summary,
      probe,
      detail: detailParts.join(" · "),
    };
  } catch (error) {
    return {
      id: "indexer",
      name: "Indexer",
      status: "down",
      summary: "Could not read indexer_state",
      probe,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function collectSystemHealth(): Promise<SystemHealthReport> {
  const checks = await Promise.all([
    checkPostgres(),
    checkNginx(),
    checkRealtimeHttp(),
    checkWebSocket(),
    checkRedis(),
    checkIndexer(),
  ]);

  return {
    overall: worstStatus(checks),
    checkedAt: new Date().toISOString(),
    checks,
  };
}

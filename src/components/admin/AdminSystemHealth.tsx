"use client";

import { useCallback, useEffect, useState } from "react";

type ServiceHealthStatus = "healthy" | "degraded" | "down";

type ServiceHealthCheck = {
  id: string;
  name: string;
  status: ServiceHealthStatus;
  summary: string;
  probe: string;
  detail?: string;
  latencyMs?: number;
};

type SystemHealthReport = {
  overall: ServiceHealthStatus;
  checkedAt: string;
  checks: ServiceHealthCheck[];
};

function statusLabel(status: ServiceHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
  }
}

function statusBadgeClass(status: ServiceHealthStatus): string {
  switch (status) {
    case "healthy":
      return "status-badge border-pump-accent/30 bg-pump-accent/10 text-pump-accent";
    case "degraded":
      return "status-badge border-pump-warning/30 bg-pump-warning/10 text-pump-warning";
    case "down":
      return "status-badge border-pump-danger/30 bg-pump-danger/10 text-pump-danger";
  }
}

function overallBannerClass(status: ServiceHealthStatus): string {
  switch (status) {
    case "healthy":
      return "border-pump-accent/25 bg-pump-accent/5";
    case "degraded":
      return "border-pump-warning/25 bg-pump-warning/5";
    case "down":
      return "border-pump-danger/25 bg-pump-danger/5";
  }
}

function formatCheckedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminSystemHealth({ address }: { address: string }) {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/system-health?address=${address}`, { cache: "no-store" });
      const json = (await res.json()) as { data?: SystemHealthReport; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load system health");
      setReport(json.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load system health");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const overall = report?.overall ?? "down";

  return (
    <section className="panel-surface overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-pump-border/15 px-4 py-3.5 md:px-5">
        <div>
          <p className="section-label">System health</p>
          <p className="mt-0.5 field-hint">
            Live probes from the TMA server — not PM2 status. HTTP, WebSocket, DB, Redis, and
            indexer sync.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-pump-border/25 bg-pump-surface/50 px-3 py-1.5 text-caption font-medium text-pump-text transition hover:border-pump-border/40 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="notice-error m-4 rounded-lg border border-pump-danger/30 bg-pump-danger/5 px-3 py-2 text-body-sm md:m-5">
          {error}
        </div>
      ) : null}

      <div className={`mx-4 mb-4 rounded-lg border px-3 py-2.5 md:mx-5 ${overallBannerClass(overall)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusBadgeClass(overall)}>{statusLabel(overall)}</span>
          <p className="text-body-sm text-pump-text">
            {loading && !report
              ? "Running probes…"
              : report
                ? `${report.checks.filter((c) => c.status === "healthy").length}/${report.checks.length} checks passing`
                : "No data"}
          </p>
        </div>
        {report ? (
          <p className="mt-1 text-caption text-pump-muted">
            Last checked {formatCheckedAt(report.checkedAt)} · auto-refresh every 30s
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-body-sm">
          <thead>
            <tr className="border-y border-pump-border/15 bg-pump-surface/30 text-caption text-pump-muted">
              <th className="px-4 py-2.5 font-medium md:px-5">Service</th>
              <th className="px-4 py-2.5 font-medium md:px-5">Status</th>
              <th className="px-4 py-2.5 font-medium md:px-5">Result</th>
              <th className="hidden px-4 py-2.5 font-medium lg:table-cell md:px-5">Probe</th>
              <th className="px-4 py-2.5 font-medium md:px-5">Latency</th>
            </tr>
          </thead>
          <tbody>
            {(report?.checks ?? []).map((check) => (
              <tr key={check.id} className="border-b border-pump-border/10 align-top">
                <td className="px-4 py-3 font-medium text-pump-text md:px-5">{check.name}</td>
                <td className="px-4 py-3 md:px-5">
                  <span className={statusBadgeClass(check.status)}>{statusLabel(check.status)}</span>
                </td>
                <td className="max-w-xs px-4 py-3 text-pump-muted md:max-w-md md:px-5">
                  <p>{check.summary}</p>
                  {check.detail ? (
                    <p className="mt-1 break-all text-caption text-pump-muted/90">{check.detail}</p>
                  ) : null}
                </td>
                <td className="hidden max-w-sm px-4 py-3 text-caption text-pump-muted lg:table-cell md:px-5">
                  <code className="break-all">{check.probe}</code>
                </td>
                <td className="px-4 py-3 text-pump-muted md:px-5">
                  {check.latencyMs != null ? `${check.latencyMs}ms` : "—"}
                </td>
              </tr>
            ))}
            {loading && !report ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-pump-muted md:px-5">
                  Running health probes…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

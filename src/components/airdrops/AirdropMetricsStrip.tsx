"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { IconLabel } from "@/components/ui/IconLabel";
import { MetricIcons } from "@/lib/metric-icons";

type AirdropMetricsStripProps = {
  reward: ReactNode;
  progress: ReactNode;
  poolToken: ReactNode;
  status: ReactNode;
  footer?: ReactNode;
  className?: string;
};

function MetricColumn({
  label,
  icon,
  children,
  className = "",
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 px-3 py-2.5 ${className}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-pump-muted">
        {icon ? (
          <IconLabel icon={icon} hideIconMobile iconClassName="h-3 w-3 shrink-0 opacity-70">
            {label}
          </IconLabel>
        ) : (
          label
        )}
      </dt>
      <dd className="mt-1 m-0">{children}</dd>
    </div>
  );
}

export function AirdropMetricsStrip({
  reward,
  progress,
  poolToken,
  status,
  footer,
  className = "",
}: AirdropMetricsStripProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-pump-border/45 bg-pump-surface/25 ${className}`}
    >
      <dl className="grid grid-cols-2 divide-y divide-pump-border/20 md:grid-cols-4 md:divide-x md:divide-y-0">
        <MetricColumn label="Reward pool" icon={MetricIcons.rewardPool}>{reward}</MetricColumn>
        <MetricColumn label="Progress" icon={MetricIcons.progress}>{progress}</MetricColumn>
        <MetricColumn label="Pool token" icon={MetricIcons.poolToken} className="hidden md:block">
          {poolToken}
        </MetricColumn>
        <MetricColumn label="Status" icon={MetricIcons.status} className="hidden md:block">
          {status}
        </MetricColumn>
      </dl>
      {footer ? (
        <div className="border-t border-pump-border/20 px-3 py-2 text-[11px] leading-snug text-pump-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

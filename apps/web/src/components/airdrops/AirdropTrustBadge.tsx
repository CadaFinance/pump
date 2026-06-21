import { ShieldCheck } from "lucide-react";
import { ICON_STROKE } from "@/lib/icons";

type AirdropTrustBadgeProps = {
  className?: string;
};

/** User-facing trust signal — rewards are locked in the campaign contract. */
export function AirdropTrustBadge({ className = "" }: AirdropTrustBadgeProps) {
  return (
    <span
      className={`status-badge inline-flex shrink-0 items-center gap-1 border-pump-success/35 bg-pump-success/10 text-[10px] font-semibold text-pump-success ${className}`}
      title="Reward pool is locked on-chain until distribution"
    >
      <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
      Rewards secured
    </span>
  );
}

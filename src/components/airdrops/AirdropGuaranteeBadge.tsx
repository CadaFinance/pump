import { ShieldCheck } from "lucide-react";
import { AIRDROP_GUARANTEE_HEADLINE } from "@/lib/airdrop-trust";
import { ICON_STROKE } from "@/lib/icons";

type AirdropGuaranteeBadgeProps = {
  compact?: boolean;
  className?: string;
};

export function AirdropGuaranteeBadge({
  compact = false,
  className = "",
}: AirdropGuaranteeBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-sm border border-pump-success/30 bg-pump-success/10 px-2 py-0.5 text-[11px] font-semibold leading-tight text-pump-success ${className}`.trim()}
      title={AIRDROP_GUARANTEE_HEADLINE}
    >
      <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
      <span className="truncate">
        {compact ? "Funded pool" : AIRDROP_GUARANTEE_HEADLINE}
      </span>
    </span>
  );
}

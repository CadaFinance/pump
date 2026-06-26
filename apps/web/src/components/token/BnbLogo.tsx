import { NativeLogo } from "@/components/token/NativeLogo";

/** @deprecated Use NativeLogo — kept for existing imports. */
export function BnbLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <NativeLogo size={size} className={className} />;
}

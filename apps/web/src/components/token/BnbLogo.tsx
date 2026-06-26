import { NativeCurrencyLogo } from "@/components/token/NativeCurrencyLogo";

/** @deprecated Use NativeCurrencyLogo — app native currency is ETH on Base. */
export function BnbLogo(props: { size?: number; className?: string }) {
  return <NativeCurrencyLogo {...props} />;
}

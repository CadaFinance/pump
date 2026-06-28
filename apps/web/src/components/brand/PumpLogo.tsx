import { PUMP_LOGO_SRC } from "@/lib/pump-logo-paths";

type PumpLogoProps = {
  size?: number;
  className?: string;
};

export function PumpLogo({ size = 32, className = "" }: PumpLogoProps) {
  return (
    <img
      src={PUMP_LOGO_SRC}
      alt=""
      width={size}
      height={size}
      className={`pump-logo ${className}`.trim()}
      aria-hidden
      decoding="async"
    />
  );
}

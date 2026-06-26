import Image from "next/image";
import { NATIVE_SYMBOL } from "@/config/chain";
import ethLogoSrc from "@/app/logos/eth-diamond-(white).svg";

export function NativeLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={ethLogoSrc}
      alt={NATIVE_SYMBOL}
      width={size}
      height={size}
      className={`native-logo shrink-0 ${className}`}
    />
  );
}

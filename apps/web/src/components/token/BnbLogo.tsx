import Image from "next/image";
import bnbLogoSrc from "@/app/logos/bnb-bnb-logo.png";

export function BnbLogo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={bnbLogoSrc}
      alt="BNB"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}

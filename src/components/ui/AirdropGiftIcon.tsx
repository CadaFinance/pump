import { Gift } from "lucide-react";
import { ICON_STROKE } from "@/lib/icons";

type AirdropGiftIconProps = {
  className?: string;
  size?: number;
};

/** Animated gift marker for tokens with an open airdrop campaign. */
export function AirdropGiftIcon({ className = "", size = 13 }: AirdropGiftIconProps) {
  return (
    <span className={`airdrop-gift-icon inline-flex shrink-0 ${className}`} aria-hidden>
      <Gift
        className="airdrop-gift-icon__glyph"
        width={size}
        height={size}
        strokeWidth={ICON_STROKE}
      />
    </span>
  );
}

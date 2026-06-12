import { Star } from "lucide-react";
import { ICON_STROKE } from "@/lib/icons";

type FavoriteIconProps = {
  active: boolean;
  className?: string;
};

export function FavoriteIcon({ active, className = "h-4 w-4" }: FavoriteIconProps) {
  return (
    <Star
      className={className}
      strokeWidth={ICON_STROKE}
      fill={active ? "currentColor" : "none"}
      aria-hidden
    />
  );
}

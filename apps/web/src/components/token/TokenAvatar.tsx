"use client";

import { useEffect, useState } from "react";
import { resolveLaunchpadLogoUri } from "@/lib/assets";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type TokenAvatarProps = {
  address: string;
  symbol: string;
  logoUrl?: string | null;
  /** Local blob/data URL shown before upload completes. */
  previewUrl?: string | null;
  size?: number;
  /** circle = default avatar; rounded = corporate tile (sidebar, tables). */
  shape?: "circle" | "rounded";
  className?: string;
};

export function TokenAvatar({
  address,
  symbol,
  logoUrl,
  previewUrl,
  size = 40,
  shape = "circle",
  className = "",
}: TokenAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const letter = symbol.charAt(0).toUpperCase() || "?";
  const isPlaceholder = address.toLowerCase() === ZERO_ADDRESS;
  const radiusClass = shape === "rounded" ? "rounded-[var(--radius-sm)]" : "rounded-full";
  const ringClass =
    shape === "rounded"
      ? "ring-1 ring-pump-border/25"
      : "ring-2 ring-pump-border/15";

  const src =
    previewUrl ??
    (logoUrl?.startsWith("data:") || logoUrl?.startsWith("blob:") ? logoUrl : null) ??
    (logoUrl?.trim() ? resolveLaunchpadLogoUri(logoUrl, address) : null) ??
    (isPlaceholder ? null : resolveLaunchpadLogoUri(null, address));

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const fallback = (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-pump-border/20 bg-pump-surface/70 text-sm font-semibold text-pump-text ${radiusClass} ${ringClass} ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {letter}
    </span>
  );

  if (!src || imgError) return fallback;

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={`shrink-0 object-cover ${radiusClass} ${ringClass} ${className}`}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}

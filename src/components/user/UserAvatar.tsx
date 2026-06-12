"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { getDiceBearStyle } from "@/lib/dicebear-styles";
import {
  USER_AVATAR_BG_COLORS,
  resolveUserAvatarId,
} from "@/lib/user-avatars";

type UserAvatarProps = {
  address: string;
  avatarId: string;
  size?: number;
  className?: string;
  selected?: boolean;
};

export function UserAvatar({
  address,
  avatarId,
  size = 40,
  className = "",
  selected = false,
}: UserAvatarProps) {
  const variant = resolveUserAvatarId(avatarId);
  const seed = address.toLowerCase();

  const src = useMemo(() => {
    return createAvatar(getDiceBearStyle(variant), {
      seed,
      size,
      backgroundColor: USER_AVATAR_BG_COLORS,
      backgroundType: ["solid"],
    }).toDataUri();
  }, [variant, seed, size]);

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`inline-block shrink-0 rounded-full bg-pump-surface/40 object-cover shadow-sm ring-2 ${
        selected ? "ring-pump-accent" : "ring-pump-border/20"
      } ${className}`}
    />
  );
}

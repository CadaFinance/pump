"use client";

import { useEffect, useState } from "react";
import type { UserAvatarId } from "@/lib/user-avatars";
import { UserAvatar } from "@/components/user/UserAvatar";
import { fetchUserAvatarId, getCachedUserAvatarId } from "@/lib/user-avatar-cache";

type UserAvatarForAddressProps = {
  address: string;
  size?: number;
  className?: string;
};

export function UserAvatarForAddress({
  address,
  size = 40,
  className = "",
}: UserAvatarForAddressProps) {
  const normalized = address.toLowerCase();
  const [avatarId, setAvatarId] = useState<UserAvatarId | null>(
    () => getCachedUserAvatarId(normalized)
  );

  useEffect(() => {
    const cached = getCachedUserAvatarId(normalized);
    if (cached) {
      setAvatarId(cached);
      return;
    }

    let cancelled = false;
    void fetchUserAvatarId(normalized).then((next) => {
      if (!cancelled && next) setAvatarId(next);
    });

    return () => {
      cancelled = true;
    };
  }, [normalized]);

  if (!avatarId) {
    return (
      <span
        className={`skeleton-shimmer inline-block shrink-0 rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <UserAvatar address={address} avatarId={avatarId} size={size} className={className} />
  );
}

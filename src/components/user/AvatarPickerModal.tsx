"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  USER_AVATAR_IDS,
  USER_AVATAR_LABELS,
  type UserAvatarId,
} from "@/lib/user-avatars";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useUserAvatar } from "@/components/user/UserAvatarProvider";

type AvatarPickerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AvatarPickerModal({ open, onClose }: AvatarPickerModalProps) {
  const { address } = useAccount();
  const { avatarId, updateAvatar } = useUserAvatar();
  const [pendingId, setPendingId] = useState<UserAvatarId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open || !address) return null;

  const current = avatarId ?? USER_AVATAR_IDS[0];

  async function onSelect(id: UserAvatarId) {
    if (id === current) return;
    setError(null);
    setPendingId(id);
    try {
      await updateAvatar(id);
      onClose();
    } catch {
      setError("Could not save avatar. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="panel-surface relative w-full max-w-md p-5 shadow-panel">
        <h2 id="avatar-picker-title" className="text-h2 font-semibold text-pump-text">
          Choose avatar
        </h2>
        <p className="mt-1 text-sm text-pump-muted">
          DiceBear styles — your wallet address makes each one unique. Pick the look you like.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {USER_AVATAR_IDS.map((id) => {
            const isSelected = id === current;
            const isPending = pendingId === id;
            return (
              <button
                key={id}
                type="button"
                disabled={pendingId !== null}
                onClick={() => void onSelect(id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg p-2 transition ${
                  isSelected ? "bg-pump-accent/10 ring-1 ring-pump-accent/40" : "hover:bg-pump-surface/50"
                }`}
                aria-label={`${USER_AVATAR_LABELS[id]} avatar`}
                aria-pressed={isSelected}
              >
                <UserAvatar
                  address={address}
                  avatarId={id}
                  size={52}
                  selected={isSelected}
                />
                <span className="text-[10px] font-medium text-pump-muted">
                  {isPending ? "…" : isSelected ? "Active" : USER_AVATAR_LABELS[id]}
                </span>
              </button>
            );
          })}
        </div>

        {error ? <p className="notice-error mt-4 text-body-sm">{error}</p> : null}

        <button type="button" onClick={onClose} className="secondary-button mt-5 w-full py-2.5">
          Close
        </button>
      </div>
    </div>
  );
}

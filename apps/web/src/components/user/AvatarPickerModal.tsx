"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  USER_AVATAR_IDS,
  USER_AVATAR_LABELS,
  type UserAvatarId,
} from "@/lib/user-avatars";
import { UserAvatar } from "@/components/user/UserAvatar";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useUserAvatar } from "@/components/user/UserAvatarProvider";
import { resolveDisplayUsername, USERNAME_MAX_LENGTH } from "@/lib/username";

type AvatarPickerModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AvatarPickerModal({ open, onClose }: AvatarPickerModalProps) {
  const { address } = useAccount();
  const { avatarId, username, updateProfile } = useUserAvatar();
  const [selectedId, setSelectedId] = useState<UserAvatarId>(USER_AVATAR_IDS[0]);
  const [usernameInput, setUsernameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId(avatarId ?? USER_AVATAR_IDS[0]);
    setUsernameInput(username ?? "");
    setError(null);
  }, [open, avatarId, username]);

  if (!open || !address) return null;

  const defaultLabel = resolveDisplayUsername(address, null);

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      const nextUsername = usernameInput.trim() === "" ? null : usernameInput;
      await updateProfile({
        avatarId: selectedId,
        username: nextUsername,
      });
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Could not save profile. Try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal open={open}>
      <div
        className="modal-backdrop modal-backdrop-shell z-[70]"
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
            Edit profile
          </h2>
          <p className="mt-1 text-body-sm text-pump-muted">
            Choose an avatar and username. Default is your wallet address.
          </p>

          <label className="mt-4 block">
            <span className="section-label text-pump-muted">Username</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-body-sm text-pump-muted">@</span>
              <input
                type="text"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                maxLength={USERNAME_MAX_LENGTH}
                placeholder={defaultLabel}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-md border border-pump-border/50 bg-pump-bg px-3 py-2 text-body-sm text-pump-text outline-none focus:border-pump-accent/50"
              />
            </div>
            <span className="mt-1 block text-caption text-pump-muted">
              {USERNAME_MAX_LENGTH} characters max · letters, numbers, underscores · unique
            </span>
          </label>

          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {USER_AVATAR_IDS.map((id) => {
              const isSelected = id === selectedId;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={saving}
                  onClick={() => setSelectedId(id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg p-2 transition ${
                    isSelected
                      ? "bg-pump-accent/10 ring-1 ring-pump-accent/40"
                      : "hover:bg-pump-surface/50"
                  }`}
                  aria-label={`${USER_AVATAR_LABELS[id]} avatar`}
                  aria-pressed={isSelected}
                >
                  <UserAvatar address={address} avatarId={id} size={52} selected={isSelected} />
                  <span className="text-[10px] font-medium text-pump-muted">
                    {isSelected ? "Selected" : USER_AVATAR_LABELS[id]}
                  </span>
                </button>
              );
            })}
          </div>

          {error ? <p className="notice-error mt-4 text-body-sm">{error}</p> : null}

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onClose} className="secondary-button flex-1 py-2.5" disabled={saving}>
              Cancel
            </button>
            <button type="button" onClick={() => void onSave()} className="primary-button flex-1 py-2.5" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

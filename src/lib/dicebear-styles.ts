import type { Style } from "@dicebear/core";
import {
  adventurer,
  avataaars,
  bigSmile,
  bottts,
  croodles,
  funEmoji,
  lorelei,
  micah,
  notionists,
  personas,
  pixelArt,
  toonHead,
} from "@dicebear/collection";
import type { UserAvatarId } from "@/lib/user-avatars";

export const DICEBEAR_STYLE_MAP: Record<UserAvatarId, Style<Record<string, unknown>>> = {
  avataaars,
  bottts,
  pixelArt,
  funEmoji,
  lorelei,
  adventurer,
  bigSmile,
  croodles,
  micah,
  personas,
  notionists,
  toonHead,
};

export function getDiceBearStyle(avatarId: UserAvatarId): Style<Record<string, unknown>> {
  return DICEBEAR_STYLE_MAP[avatarId];
}

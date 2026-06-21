import type { UserAvatarId } from "@/lib/user-avatars";

const avatarIdCache = new Map<string, UserAvatarId>();
const inflight = new Map<string, Promise<UserAvatarId | null>>();

export function getCachedUserAvatarId(address: string): UserAvatarId | null {
  return avatarIdCache.get(address.toLowerCase()) ?? null;
}

export function fetchUserAvatarId(address: string): Promise<UserAvatarId | null> {
  const normalized = address.toLowerCase();
  const cached = avatarIdCache.get(normalized);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(normalized);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const response = await fetch(
        `/api/user/avatar?address=${encodeURIComponent(normalized)}`,
        { cache: "no-store" }
      );
      const body = (await response.json()) as { data?: { avatarId?: UserAvatarId } };
      if (response.ok && body.data?.avatarId) {
        avatarIdCache.set(normalized, body.data.avatarId);
        return body.data.avatarId;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight.delete(normalized);
    }
  })();

  inflight.set(normalized, promise);
  return promise;
}

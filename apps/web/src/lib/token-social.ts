export type TokenSocialLinks = {
  twitter?: string;
  website?: string;
  telegram?: string;
  discord?: string;
};

export const EMPTY_SOCIAL_LINKS: TokenSocialLinks = {};

export function normalizeSocialLinks(input: TokenSocialLinks): TokenSocialLinks {
  const out: TokenSocialLinks = {};
  const twitter = input.twitter?.trim();
  const website = input.website?.trim();
  const telegram = input.telegram?.trim();
  const discord = input.discord?.trim();

  if (twitter) out.twitter = twitter;
  if (website) out.website = website;
  if (telegram) out.telegram = telegram;
  if (discord) out.discord = discord;

  return out;
}

export function parseSocialLinksFromDb(value: unknown): TokenSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_SOCIAL_LINKS;
  }

  const raw = value as Record<string, unknown>;
  return normalizeSocialLinks({
    twitter: typeof raw.twitter === "string" ? raw.twitter : undefined,
    website: typeof raw.website === "string" ? raw.website : undefined,
    telegram: typeof raw.telegram === "string" ? raw.telegram : undefined,
    discord: typeof raw.discord === "string" ? raw.discord : undefined,
  });
}

export function hasSocialLinks(links: TokenSocialLinks): boolean {
  return Boolean(links.twitter || links.website || links.telegram || links.discord);
}

import { hasSocialLinks, type TokenSocialLinks } from "@/lib/token-social";

type TokenSocialLinksBarProps = {
  links: TokenSocialLinks;
  inline?: boolean;
};

const LINK_ITEMS = [
  { key: "twitter" as const, label: "X" },
  { key: "website" as const, label: "Website" },
  { key: "telegram" as const, label: "Telegram" },
  { key: "discord" as const, label: "Discord" },
];

export function TokenSocialLinksBar({ links, inline = false }: TokenSocialLinksBarProps) {
  if (!hasSocialLinks(links)) return null;

  return (
    <div
      className={
        inline
          ? "flex shrink-0 flex-wrap items-center gap-1"
          : "mt-3 flex flex-wrap gap-2"
      }
    >
      {LINK_ITEMS.map(({ key, label }) => {
        const href = links[key];
        if (!href) return null;

        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={
              inline
                ? "rounded-sm border border-pump-border/20 bg-pump-surface/65 px-2 py-0.5 text-caption font-medium text-pump-muted transition hover:border-pump-accent/35 hover:text-pump-text"
                : "rounded-sm border border-pump-border/20 bg-pump-surface/65 px-3 py-1 text-xs font-medium text-pump-muted transition hover:border-pump-accent/35 hover:text-pump-text"
            }
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

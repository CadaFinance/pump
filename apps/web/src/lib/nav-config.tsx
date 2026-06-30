import type { PumpIconDefinition } from "@/lib/icons";
import { faAirdropParachute, faList, faTarget, faWallet } from "@/lib/pump-fa-icons";

export type AppNavItem = {
  href: string;
  label: string;
  icon: PumpIconDefinition;
};

/** Desktop header — full primary navigation. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Arena", icon: faList },
  { href: "/airdrops", label: "Airdrops", icon: faAirdropParachute },
  { href: "/missions", label: "Missions", icon: faTarget },
  { href: "/portfolio", label: "Portfolio", icon: faWallet },
];

/** Mobile bottom bar — left cluster (before Create FAB). */
export const APP_BOTTOM_TAB_BEFORE_CREATE: AppNavItem[] = [
  { href: "/", label: "Arena", icon: faList },
  { href: "/airdrops", label: "Airdrops", icon: faAirdropParachute },
];

/** Mobile bottom bar — right cluster (after Create FAB). */
export const APP_BOTTOM_TAB_AFTER_CREATE: AppNavItem[] = [
  { href: "/portfolio", label: "Portfolio", icon: faWallet },
];

/** Mobile “More” overflow sheet — secondary destinations. */
export const APP_MORE_NAV_ITEMS: AppNavItem[] = [
  { href: "/missions", label: "Missions", icon: faTarget },
];

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function isMoreRoute(pathname: string): boolean {
  return APP_MORE_NAV_ITEMS.some((item) => isNavActive(pathname, item.href));
}

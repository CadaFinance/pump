import type { PumpIconDefinition } from "@/lib/icons";
import { faAirdropParachute, faLayoutGrid, faTarget, faWallet } from "@/lib/pump-fa-icons";

export type AppNavItem = {
  href: string;
  label: string;
  icon: PumpIconDefinition;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Arena", icon: faLayoutGrid },
  { href: "/airdrops", label: "Airdrops", icon: faAirdropParachute },
  { href: "/missions", label: "Missions", icon: faTarget },
  { href: "/portfolio", label: "Portfolio", icon: faWallet },
];

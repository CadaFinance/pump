import type { LucideIcon } from "lucide-react";
import { Gift, LayoutGrid, Shield, Target, Wallet } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Arena", icon: LayoutGrid },
  { href: "/airdrops", label: "Airdrops", icon: Gift },
  { href: "/missions", label: "Missions", icon: Target },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

export const ADMIN_NAV_ITEM: AppNavItem = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
};

import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Target, Wallet } from "lucide-react";
import { AirdropParachute } from "@/components/icons/AirdropParachute";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Arena", icon: LayoutGrid },
  { href: "/airdrops", label: "Airdrops", icon: AirdropParachute },
  { href: "/missions", label: "Missions", icon: Target },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

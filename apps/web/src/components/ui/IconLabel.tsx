import type { ElementType, ReactNode } from "react";
import { PumpIcon, type PumpIconDefinition } from "@/lib/icons";

type IconLabelProps = {
  icon: PumpIconDefinition;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
  /** Hide icon below md — use on tight mobile stat cards */
  hideIconMobile?: boolean;
  as?: ElementType;
};

export function IconLabel({
  icon,
  children,
  className = "",
  iconClassName = "h-3.5 w-3.5 shrink-0 opacity-75",
  hideIconMobile = false,
  as: Tag = "span",
}: IconLabelProps) {
  const iconCls = `${iconClassName}${hideIconMobile ? " hidden md:block" : ""}`;

  return (
    <Tag className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <PumpIcon icon={icon} className={iconCls} />
      <span className="min-w-0 truncate">{children}</span>
    </Tag>
  );
}

export function SectionHeadingIcon({
  icon,
  children,
  className = "",
}: {
  icon: PumpIconDefinition;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`section-heading inline-flex items-center gap-2 ${className}`}>
      <PumpIcon icon={icon} className="h-[1.05em] w-[1.05em] shrink-0 text-pump-accent" />
      {children}
    </h2>
  );
}

export function TableHeaderLabel({
  icon,
  children,
}: {
  icon?: PumpIconDefinition;
  children: ReactNode;
}) {
  if (!icon) return <>{children}</>;

  return (
    <span className="inline-flex items-center gap-1">
      <PumpIcon icon={icon} className="h-3 w-3 shrink-0 opacity-70" />
      {children}
    </span>
  );
}

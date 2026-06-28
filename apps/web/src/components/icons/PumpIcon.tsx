"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";

export type { IconDefinition as PumpIconDefinition, IconProp as PumpIconProp } from "@fortawesome/fontawesome-svg-core";

type PumpIconProps = {
  icon: IconProp;
  className?: string;
  fixedWidth?: boolean;
};

/** Font Awesome icon wrapper — use with icons from `@/lib/pump-fa-icons`. */
export function PumpIcon({ icon, className, fixedWidth = false }: PumpIconProps) {
  return <FontAwesomeIcon icon={icon} className={className} fixedWidth={fixedWidth} aria-hidden />;
}

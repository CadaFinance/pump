"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { tokenDetailPath } from "@/lib/token-routes";

type TokenDetailLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  address: string;
};

export function TokenDetailLink({
  address,
  prefetch = true,
  onMouseEnter,
  onFocus,
  ...rest
}: TokenDetailLinkProps) {
  const router = useRouter();
  const href = tokenDetailPath(address);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={(event) => {
        router.prefetch(href);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        router.prefetch(href);
        onFocus?.(event);
      }}
      {...rest}
    />
  );
}

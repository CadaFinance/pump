"use client";

import { useRouter } from "next/navigation";
import { PumpIcon, faChevronLeft } from "@/lib/icons";
import { getPreviousNavPath } from "@/lib/nav-history";

type PageBackLinkProps = {
  /** Fallback when opened directly (no in-app history). */
  href: string;
  className?: string;
};

/**
 * Browser-style back: tracked in-app previous route, then history.back(), then fallback.
 */
export function PageBackLink({ href, className = "" }: PageBackLinkProps) {
  const router = useRouter();

  return (
    <a
      href={href}
      className={`page-back-link${className ? ` ${className}` : ""}`}
      aria-label="Go back"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();

        const here = window.location.pathname + window.location.search;
        const prev = getPreviousNavPath();
        if (prev && prev !== here) {
          router.push(prev);
          return;
        }

        let popped = false;
        const onPopState = () => {
          popped = true;
          window.removeEventListener("popstate", onPopState);
        };
        window.addEventListener("popstate", onPopState);
        router.back();
        window.setTimeout(() => {
          window.removeEventListener("popstate", onPopState);
          if (!popped && window.location.pathname + window.location.search === here) {
            router.push(href);
          }
        }, 400);
      }}
    >
      <PumpIcon icon={faChevronLeft} className="page-back-link__icon" />
      <span>Back</span>
    </a>
  );
}

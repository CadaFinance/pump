"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-pump-border/18 bg-pump-surface/52 text-pump-muted transition hover:border-pump-accent/25 hover:text-pump-text"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] fill-none stroke-current">
          <path
            d="M14.5 3.5a7.5 7.5 0 1 0 6 11.8 8.4 8.4 0 0 1-3.27.66A8.26 8.26 0 0 1 9 7.77c0-1.13.22-2.22.64-3.27a7.45 7.45 0 0 0 4.86-1Z"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] fill-none stroke-current">
          <circle cx="12" cy="12" r="4.25" strokeWidth="1.8" />
          <path
            d="M12 2.75v2.1M12 19.15v2.1M5.46 5.46l1.48 1.48M17.06 17.06l1.48 1.48M2.75 12h2.1M19.15 12h2.1M5.46 18.54l1.48-1.48M17.06 6.94l1.48-1.48"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

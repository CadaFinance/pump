"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { PumpIcon, faMoon, faSun } from "@/lib/icons";

export function ThemePicker() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="toolbar-btn text-pump-muted"
    >
      {isDark ? (
        <PumpIcon icon={faSun} className="h-[1.125rem] w-[1.125rem]" />
      ) : (
        <PumpIcon icon={faMoon} className="h-[1.125rem] w-[1.125rem]" />
      )}
    </button>
  );
}

/** @deprecated Use ThemePicker */
export function ThemeToggle() {
  return <ThemePicker />;
}

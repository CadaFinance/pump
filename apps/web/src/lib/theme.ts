export const THEME_IDS = ["light", "dark", "navy", "slate"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_STORAGE_KEY = "pump-theme";

/** Default: Institutional Midnight — best match for token detail terminal. */
export const DEFAULT_THEME_ID: ThemeId = "navy";

export const THEME_LABELS: Record<ThemeId, string> = {
  light: "Institutional Light",
  dark: "Terminal Graphite",
  navy: "Institutional Midnight",
  slate: "Carbon Slate",
};

export const THEME_SWATCHES: Record<ThemeId, { bg: string; accent: string }> = {
  light: { bg: "#f4f6f8", accent: "#1a7a8a" },
  dark: { bg: "#0b0e11", accent: "#5b8dc9" },
  navy: { bg: "#0a0f1a", accent: "#3776c8" },
  slate: { bg: "#0d0f12", accent: "#4a80b8" },
};

export function isValidTheme(value: string | null | undefined): value is ThemeId {
  return value === "light" || value === "dark" || value === "navy" || value === "slate";
}

export function isDarkTheme(theme: ThemeId): boolean {
  return theme === "dark" || theme === "navy" || theme === "slate";
}

export function getColorScheme(theme: ThemeId): "light" | "dark" {
  return isDarkTheme(theme) ? "dark" : "light";
}

export function getRainbowAccent(theme: ThemeId): { accentColor: string; accentColorForeground: string } {
  switch (theme) {
    case "navy":
      return { accentColor: "#3776c8", accentColorForeground: "#f4f8fc" };
    case "slate":
      return { accentColor: "#4a80b8", accentColorForeground: "#f4f6fa" };
    case "light":
      return { accentColor: "#1a7a8a", accentColorForeground: "#f7fcfb" };
    default:
      return { accentColor: "#5b8dc9", accentColorForeground: "#0b0e11" };
  }
}

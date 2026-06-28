export const THEME_IDS = ["light", "dark", "navy", "slate"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_STORAGE_KEY = "pump-theme";

/** Default: Terminal Graphite — Binance panel ladder, lifted canvas for token terminal. */
export const DEFAULT_THEME_ID: ThemeId = "dark";

export const THEME_LABELS: Record<ThemeId, string> = {
  light: "Boardroom Light",
  dark: "Terminal Graphite",
  navy: "Midnight Banking",
  slate: "Executive Carbon",
};

export const THEME_SWATCHES: Record<ThemeId, { bg: string; accent: string }> = {
  light: { bg: "#f7f7f7", accent: "#0052ff" },
  dark: { bg: "#14171c", accent: "#3b82f6" },
  navy: { bg: "#12183a", accent: "#2d7dd2" },
  slate: { bg: "#161b22", accent: "#58a6ff" },
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
      return { accentColor: "#2d7dd2", accentColorForeground: "#f4f8ff" };
    case "slate":
      return { accentColor: "#58a6ff", accentColorForeground: "#0d1117" };
    case "light":
      return { accentColor: "#0052ff", accentColorForeground: "#ffffff" };
    default:
      return { accentColor: "#3b82f6", accentColorForeground: "#ffffff" };
  }
}

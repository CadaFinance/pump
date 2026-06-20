export const TELEGRAM_LOGIN_SCRIPT_URL = "https://telegram.org/js/telegram-login.js";
export const TELEGRAM_LEGACY_WIDGET_SCRIPT_URL = "https://telegram.org/js/telegram-widget.js?22";

export function getTelegramLegacyRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/telegram/legacy-callback`;
}

export function getTelegramOidcRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/telegram/callback`;
}

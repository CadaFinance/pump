export const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

/** Client-safe: only checks public env (bot username). */
export function isTelegramAuthConfigured(): boolean {
  return Boolean(telegramBotUsername && telegramBotUsername !== "CHANGE_ME");
}

/** Server-only: username + bot token for API routes. */
export function isTelegramServerConfigured(): boolean {
  return (
    isTelegramAuthConfigured() &&
    Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) &&
    process.env.TELEGRAM_BOT_TOKEN !== "CHANGE_ME"
  );
}

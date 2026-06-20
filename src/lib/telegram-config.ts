export const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export function isTelegramAuthConfigured(): boolean {
  return Boolean(telegramBotUsername && telegramBotUsername !== "CHANGE_ME");
}

export function isTelegramServerConfigured(): boolean {
  const hasBotToken =
    Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) &&
    process.env.TELEGRAM_BOT_TOKEN !== "CHANGE_ME";

  const clientId =
    process.env.NEXT_PUBLIC_TELEGRAM_OIDC_CLIENT_ID?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim()?.split(":")[0] ||
    "";

  return isTelegramAuthConfigured() && hasBotToken && Boolean(clientId);
}

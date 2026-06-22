import { telegramBotUsername, isTelegramAuthConfigured, isTelegramServerConfigured } from "@/lib/telegram-config";

export { telegramBotUsername, isTelegramAuthConfigured, isTelegramServerConfigured };

export function isGoogleAuthConfigured(): boolean {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientId !== "CHANGE_ME" && secret && secret !== "CHANGE_ME");
}

export function isGoogleServerConfigured(): boolean {
  return isGoogleAuthConfigured();
}

export function isAppleAuthConfigured(): boolean {
  const clientId = process.env.NEXT_PUBLIC_APPLE_OAUTH_CLIENT_ID?.trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKey = process.env.APPLE_PRIVATE_KEY?.trim();
  return Boolean(
    clientId &&
      clientId !== "CHANGE_ME" &&
      teamId &&
      keyId &&
      privateKey &&
      privateKey !== "CHANGE_ME"
  );
}

export function isAppleServerConfigured(): boolean {
  return isAppleAuthConfigured();
}

export function isPumpAuthConfigured(): boolean {
  return (
    isTelegramAuthConfigured() || isGoogleAuthConfigured() || isAppleAuthConfigured()
  );
}

export function isPumpAuthServerConfigured(): boolean {
  return (
    isTelegramServerConfigured() || isGoogleServerConfigured() || isAppleServerConfigured()
  );
}

---
name: pump-tma-telegram-auth
description: >-
  Telegram OIDC login for pump-tma (oauth.telegram.org + JWKS). Use when changing
  Telegram auth, login modal, callback routes, BotFather Web Login setup, or
  migrating off the legacy HMAC widget.
---

# Pump TMA — Telegram Auth (OIDC)

**Official docs:** [Log In With Telegram](https://core.telegram.org/bots/telegram-login) · legacy widget archived at [widgets/login-legacy](https://core.telegram.org/widgets/login-legacy)

Pump uses **OIDC primary**, **legacy HMAC redirect fallback**.

## Stack

| Layer | Implementation |
|-------|----------------|
| Primary UI | `TelegramLoginModal` → `telegram-login.js` popup (`Telegram.Login.auth`) |
| Mobile handoff | `GET /api/auth/telegram/start` → `oauth.telegram.org/auth` redirect + PKCE |
| Popup API | `POST /api/auth/telegram/oidc` — verify `id_token` via JWKS |
| Legacy fallback | iframe widget `data-auth-url` → `GET /api/auth/telegram/legacy-callback` (HMAC) |
| Session | `AUTH_COOKIE_NAME` + `restoreTelegramKernelSession()` |

## Env

```bash
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=pump_bot
NEXT_PUBLIC_TELEGRAM_OIDC_CLIENT_ID=1234567890   # BotFather Web Login Client ID (numeric)
TELEGRAM_BOT_TOKEN=1234567890:AA...              # server only
TELEGRAM_OIDC_CLIENT_SECRET=...                  # required for mobile redirect flow
NEXT_PUBLIC_APP_URL=https://your-domain          # callback origin
```

Client ID may match bot token numeric prefix; prefer explicit `NEXT_PUBLIC_TELEGRAM_OIDC_CLIENT_ID`.

## BotFather setup

1. **Bot Settings → Web Login** — add Allowed URLs:
   - `https://your-domain`
   - `https://your-domain/api/auth/telegram/callback`
   - local: `http://localhost:3012` + callback path
2. Copy **Client ID** + **Client Secret**
3. Keep **`/setdomain`** for legacy redirect widget host binding

## Scopes

Pump requests **`openid profile`** + SDK `request_access: ['write']` (bot DM).  
Do **not** request `phone` unless product needs verified phone — avoids extra mobile friction.

## Key files

```
src/components/wallet/TelegramLoginModal.tsx
src/lib/telegram/verify-oidc-token.ts      # jose + JWKS
src/lib/telegram/oidc-config.ts            # server: PKCE cookie, token exchange
src/lib/telegram/telegram-login-sdk.ts     # client: load script, popup
src/app/api/auth/telegram/oidc/route.ts
src/app/api/auth/telegram/start/route.ts
src/app/api/auth/telegram/callback/route.ts
src/app/api/auth/telegram/legacy-callback/route.ts
src/app/auth/telegram/complete/page.tsx
next.config.ts                             # COOP: same-origin-allow-popups
```

## Headers (required)

```txt
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

Without COOP, `telegram-login.js` popup `postMessage` fails.

CSP must allow `https://oauth.telegram.org` and `https://telegram.org` for scripts/frames.

## UX flows

| Context | Button | Flow |
|---------|--------|------|
| Desktop | Continue with Telegram | OIDC popup → `id_token` → POST `/oidc` |
| Mobile | Open in Telegram app | PKCE redirect → `/callback` → `/auth/telegram/complete` |
| Blocked popup | Legacy redirect widget | HMAC GET `/legacy-callback` |

## Do NOT

- Put `TELEGRAM_BOT_TOKEN` or client secret in client bundle
- Use full bot token as `client_id` in browser (numeric id only)
- Re-enable Telegram Mini App auth paths for new work
- Remove legacy verify until OIDC is verified in prod

## Verify locally

1. `npm run dev` on `:3012`
2. BotFather URLs include `http://localhost:3012/api/auth/telegram/callback`
3. Sign in → check Network: `POST /api/auth/telegram/oidc` or redirect callback
4. Mobile UA: test **Open in Telegram app**

## Related

- Account abstraction wallet: `pump-tma-account-abstraction`
- Deprecated Mini App skill: `telegram-mini-app` (reference only)

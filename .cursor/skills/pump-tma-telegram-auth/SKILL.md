---
name: pump-tma-telegram-auth
description: >-
  Telegram OIDC login for pump-tma (oauth.telegram.org + JWKS). Use when changing
  Telegram auth, login modal, callback routes, BotFather Web Login setup, or
  migrating off the legacy HMAC widget.
---

# Pump TMA — Telegram Auth (OIDC)

**Official docs:** [Log In With Telegram](https://core.telegram.org/bots/telegram-login) · legacy widget archived at [widgets/login-legacy](https://core.telegram.org/widgets/login-legacy)

Pump uses **OIDC redirect only** (Auth0-style Universal Login). Legacy HMAC routes remain for compatibility but are not exposed in UI.

## Stack

| Layer | Implementation |
|-------|----------------|
| UI | `TelegramLoginModal` → single **Continue with Telegram** → PKCE redirect |
| Redirect | `GET /api/auth/telegram/start` → `oauth.telegram.org/auth` |
| Callback | `GET /api/auth/telegram/callback` → `/auth/telegram/complete` |
| Popup API | `POST /api/auth/telegram/oidc` — verify `id_token` via JWKS (server only; not used in modal) |
| Legacy fallback | `GET /api/auth/telegram/legacy-callback` (HMAC; not in UI) |
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
src/app/api/auth/telegram/start/route.ts
src/app/api/auth/telegram/callback/route.ts
src/app/auth/telegram/complete/page.tsx
next.config.ts                             # CSP for oauth.telegram.org
```

## UX flow

| Step | Action |
|------|--------|
| 1 | User taps **Sign in** → centered enterprise modal |
| 2 | **Continue with Telegram** → PKCE redirect to `oauth.telegram.org` |
| 3 | User approves in Telegram app / browser |
| 4 | Callback → `/auth/telegram/complete` → session restored → home |

Design follows B2B identifier-first patterns: single column, one primary OAuth CTA, trust footer, no NASCAR of alternate methods.

## Do NOT

- Put `TELEGRAM_BOT_TOKEN` or client secret in client bundle
- Use full bot token as `client_id` in browser (numeric id only)
- Re-enable popup login or legacy widget in the modal UI
- Re-enable Telegram Mini App auth paths for new work

CSP must allow `https://oauth.telegram.org` for redirect flow.

## Verify locally

1. `npm run dev` on `:3012`
2. BotFather URLs include `http://localhost:3012/api/auth/telegram/callback`
3. Sign in → redirect to Telegram → return to `/auth/telegram/complete`
4. Mobile: same flow via in-app browser handoff

## Related

- Account abstraction wallet: `pump-tma-account-abstraction`
- Deprecated Mini App skill: `telegram-mini-app` (reference only)

# Pump Admin Console — standalone MetaMask ops UI

Runs separately from the main TMA (no Connect Wallet in trader app).

## Dev

Terminal 1 — main API (`npm run dev` → :3012, or `npm run dev:local` → :80):

```bash
npm run dev
# veya port 80: npm run dev:local  → .env'e VITE_PUMP_API_URL=http://127.0.0.1:80 ekle
```

Terminal 2 — admin console (port 5174, proxies `/api` → TMA):

```bash
cd admin-console
npm install
npm run dev
```

Open http://localhost:5174 · Connect MetaMask with `NEXT_PUBLIC_ADMIN_ADDRESS`.

**Proxy error `ECONNREFUSED 127.0.0.1:3012`:** TMA çalışmıyor veya yanlış portta. `dev:local` (:80) kullanıyorsan repo `.env`:

```bash
VITE_PUMP_API_URL=http://127.0.0.1:80
```

(admin-console'u yeniden başlat)

Reads chain + contract env from repo root `.env` via Vite `loadEnv`.

## Production

```bash
cd admin-console && npm run build
```

Serve `admin-console/dist` (nginx). Proxy `/api` to pump-tma or set `VITE_PUMP_API_URL` at build time and enable CORS on admin API routes if cross-origin.

## Auth

- UI: MetaMask connected + wallet === `NEXT_PUBLIC_ADMIN_ADDRESS`
- API: `?address=` query must match same (same as before)

Main app: `/admin` route and navbar link removed.

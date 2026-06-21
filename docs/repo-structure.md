# Repository structure

Pump launchpad monorepo — single git repo, npm workspaces, corporate `apps/` layout.

```text
pump-tma/
├── apps/
│   ├── web/          @pump/web     Next.js 16 (consumer UI + API routes)
│   ├── admin/        @pump/admin    Vite admin console (injected wallet)
│   ├── indexer/      @pump/indexer  BSC chain indexer (systemd on VM)
│   └── realtime/     @pump/realtime WebSocket fan-out (PM2)
├── packages/         Future shared libs (@pump/shared, etc.)
├── contracts/        Foundry / UUPS proxies
├── db/               SQL migrations + refresh scripts
├── deploy/           VM deploy scripts + nginx snippets
├── scripts/          Dev/ops Node scripts
├── docs/
├── .env.example      Root env template (web + PM2 pump-tma)
├── ecosystem.config.cjs
└── package.json      Workspace root
```

## Commands (from repo root)

| Task | Command |
|------|---------|
| Web dev | `npm run dev` |
| Admin dev | `npm run dev:admin` |
| Web build | `npm run build` |
| Admin build | `npm run build:admin` |
| Typecheck | `npm run typecheck` |

## Env files

| Path | Service |
|------|---------|
| `.env` (repo root) | Next.js via PM2 `pump-tma` |
| `apps/realtime/.env` | PM2 `pump-realtime` |
| `/var/www/pump/Indexer/.env` | systemd indexer (rsync’d from `apps/indexer`) |

## Deploy (CI)

Single workflow: `.github/workflows/deploy.yml`

- **UI-only** change → `deploy/ui-deploy.sh` (web + admin, no indexer/realtime)
- **Non-UI** change → `deploy/tma-deploy.sh` (full stack)

Manual:

```bash
gh workflow run deploy.yml -f mode=ui
gh workflow run deploy.yml -f mode=full
```

## VM one-time migration (after pulling monorepo)

Run on VM as root/deploy user:

```bash
cd /var/www/pump/tma
git pull origin main

# 1. Realtime env (if still at old path)
if [ -f realtime/.env ] && [ ! -f apps/realtime/.env ]; then
  mv realtime/.env apps/realtime/.env
fi

# 2. PM2 — new standalone cwd
pm2 delete pump-tma 2>/dev/null || true
pm2 start ecosystem.config.cjs --only pump-tma
pm2 restart pump-realtime --update-env
pm2 save

# 3. Nginx admin static path
sudo sed -i 's|admin-console/dist|apps/admin/dist|g' /etc/nginx/sites-available/pump
sudo nginx -t && sudo systemctl reload nginx

# 4. Full deploy (build + indexer sync)
chmod +x deploy/tma-deploy.sh
./deploy/tma-deploy.sh
```

Verify:

```bash
curl -sf http://127.0.0.1:3012/api/health
curl -sf http://127.0.0.1:3013
bash deploy/vm/system-health.sh | head
```

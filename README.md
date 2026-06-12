# zugchain-pump-tma

BSC Testnet meme launchpad — Telegram Mini App.

| | |
|---|---|
| VM | `104.207.64.115` |
| SSH port | `22022` |
| Veritabanı | `pump_db` (PostgreSQL 16) |
| Zincir | BSC Testnet (`chainId 97`) |

**Local'de sadece TMA (Next.js) çalışır.** Indexer ve airdrop keeper VM'de systemd ile koşar.

---

## Repo yapısı

```text
zugchain-pump-tma/
├── .env.example        # Local TMA şablonu
├── indexer/.env.example  # VM indexer + keeper şablonu
├── schema.sql   # VM pump_db şema dump'ı (veri yok)
├── src/                # Next.js — LOCAL
├── indexer/            # Kaynak — VM'de çalışır
├── contracts/          # Foundry kontratları
└── deploy/             # systemd, nginx, vm-setup.sh
```

---

## Mimari

```text
BSC Testnet
    ↓ eth_getLogs
pump-indexer.service       →  pump_db  ←  pump_app (local TMA, SSH tunnel)
    ↑
pump-airdrop-keeper.service (qualify bitince finalize tx)
```

| Bileşen | Nerede | Ne yapar |
|---------|--------|----------|
| TMA | Local `:3012` | UI + API, DB okur/yazar |
| Indexer | VM | Trade, token, airdrop event → DB |
| Airdrop keeper | VM | Süresi dolan airdrop'ları finalize eder |
| PostgreSQL | VM | Tek kaynak: `pump_db` |

---

## 1. Local geliştirme (TMA)

### 1.1 Ortam dosyası

```powershell
cd C:\Users\DARK\Desktop\zugchain-pump-tma
copy .env.example .env
# .env içinde pump_app şifresini ve R2 bilgilerini doldur
```

### 1.2 DB tunnel (ayrı terminal — açık kalsın)

```powershell
ssh -p 22022 -L 15432:127.0.0.1:5432 root@104.207.64.115
```

`.env` içinde:

```env
DATABASE_URL=postgres://pump_app:SIFRE@127.0.0.1:15432/pump_db
```

### 1.3 Uygulamayı başlat

```powershell
npm install
npm run dev
```

→ http://localhost:3012

---

## 2. VM'den şema dump al (schema.sql)

Canlı DB şemasını local'e çekmek için. **Sadece şema, veri yok.**

### Yöntem A — Tek komut (önerilen, PowerShell)

Repo kökünde çalıştır; mevcut `schema.sql` üzerine yazar:

```powershell
cd C:\Users\DARK\Desktop\zugchain-pump-tma

ssh -p 22022 root@104.207.64.115 "sudo -u postgres pg_dump -d pump_db --schema-only --no-owner --no-privileges" | Out-File -FilePath schema.sql -Encoding utf8
```

### Yöntem B — Önce VM'de dosya, sonra scp

VM'de:

```bash
sudo -u postgres pg_dump -d pump_db --schema-only --no-owner --no-privileges -f /tmp/pump_schema.sql
```

Local'de:

```powershell
scp -P 22022 root@104.207.64.115:/tmp/pump_schema.sql C:\Users\DARK\Desktop\zugchain-pump-tma\schema.sql
```

### Doğrulama

```powershell
Select-String -Path schema.sql -Pattern "CREATE TABLE" | Measure-Object
```

VM ile karşılaştırma:

```bash
ssh -p 22022 root@104.207.64.115 "sudo -u postgres psql -d pump_db -c '\dt'"
```

> Şema değişikliği yaptıktan sonra bu adımı tekrarla; `schema.sql` her zaman VM ile senkron kalsın.

---

## 3. Indexer + keeper güncelleme (VM)

Kaynak repoda; çalıştırma VM'de.

### 3.1 Dosyaları gönder (PowerShell, repo kökü)

```powershell
cd C:\Users\DARK\Desktop\zugchain-pump-tma

ssh -p 22022 root@104.207.64.115 "mkdir -p /var/www/pump/Indexer"

scp -P 22022 -r indexer\* root@104.207.64.115:/var/www/pump/Indexer/

# ABI — local'de bir kez build:
cd contracts
forge build
cd ..

scp -P 22022 -r contracts\out root@104.207.64.115:/var/www/pump/contracts/
```

### 3.2 VM'de build + restart

```bash
ssh -p 22022 root@104.207.64.115

cd /var/www/pump/Indexer
npm install
npm run build
systemctl restart pump-indexer pump-airdrop-keeper
systemctl status pump-indexer pump-airdrop-keeper
journalctl -u pump-indexer -f
```

### 3.3 VM `.env` (indexer + keeper)

Tek dosya — her iki systemd servisi de bunu okur: `/var/www/pump/Indexer/.env`

```bash
cd /var/www/pump/Indexer
cp .env.example .env
nano .env
```

Şablon: repo içinde `indexer/.env.example` (git'te). Özet:

| Değişken | Kim kullanır |
|----------|----------------|
| `LAUNCHPAD_DATABASE_URL`, `VM1_MAIN_DB_URL` | Indexer + keeper |
| `BSC_RPC_URL`, `INDEXER_*` | Indexer |
| `CONTRACT_ARTIFACTS_DIR` | Indexer (forge `out/`) |
| `AIRDROP_KEEPER_PRIVATE_KEY`, `AIRDROP_KEEPER_POLL_MS` | Airdrop keeper |

`VM1_MAIN_DB_URL` boş kalırsa trade indexlenir ama **mission puanı yazılmaz**.

Keeper key **asla** root `.env`'ye (TMA) yazılmaz — sadece VM'deki bu dosyada.

### 3.4 systemd (ilk kurulum)

```powershell
scp -P 22022 deploy\pump-indexer.service root@104.207.64.115:/etc/systemd/system/
scp -P 22022 deploy\pump-airdrop-keeper.service root@104.207.64.115:/etc/systemd/system/
```

```bash
systemctl daemon-reload
systemctl enable --now pump-indexer pump-airdrop-keeper
```

---

## 4. Kontrat deploy (Foundry)

Sadece yeni deploy veya `PumpAirdropManager` eklerken. Private key **sadece** shell'de, dosyaya yazma.

```powershell
cd C:\Users\DARK\Desktop\zugchain-pump-tma\contracts

$env:DEPLOYER_PRIVATE_KEY="0x..."
$env:LAUNCHPAD_OWNER_ADDRESS="0x..."
$env:BSC_TESTNET_RPC="https://bsc-testnet-rpc.publicnode.com"

forge test -vv
forge script script/DeployPumpBsc.s.sol:DeployPumpBsc --rpc-url $env:BSC_TESTNET_RPC --broadcast -vvv

# Sadece airdrop manager:
forge script script/DeployAirdropBsc.s.sol:DeployAirdropBsc --rpc-url $env:BSC_TESTNET_RPC --broadcast -vvv
```

Çıktı: `contracts/deployments/bsc-testnet-pump.json`, `bsc-testnet-airdrop.json`

### Mevcut testnet adresleri

| Kontrat | Adres |
|---------|-------|
| MemeFactory | `0x2Fa07dFd25f1C2F3E2C0b6084bc5e0b87c9997A2` |
| BondingCurveManager | `0xd59D34e98f1437507fb45D6960BF8d06EB986B33` |
| PumpAirdropManager | `0xA943566a158355504f089e37062145c0f67D1d2a` |
| Admin / keeper | `0x11Ea71d1BEb04Aece4d06a585D9dbc6F58836880` |

Deploy sonrası: VM indexer `.env` → `INDEXER_START_BLOCK`, local `.env` → `NEXT_PUBLIC_*` güncelle.

---

## 5. Airdrop keeper akışı

1. Kullanıcı TMA'dan kampanya oluşturur (on-chain tx)
2. Indexer `AirdropCreated` → `pump_db`
3. Qualify süresi biter
4. Keeper DB'den adayları okur → `finalizeAirdrop` tx gönderir
5. Indexer `AirdropFinalized` → DB (`merkle_root`, allocations)
6. TMA claim ekranı güncellenir

---

## 6. Yeni VM kurulumu (ilk kez)

VM zaten ayarlıysa bu bölümü atla.

```powershell
cd C:\Users\DARK\Desktop\zugchain-pump-tma

# Önce şemayı VM'den çek (Bölüm 2)
ssh -p 22022 root@104.207.64.115 "mkdir -p /root/pump-setup"
scp -P 22022 schema.sql deploy\pump_db_grants.sql deploy\vm-setup.sh deploy\nginx-pump.conf root@104.207.64.115:/root/pump-setup/
```

VM'de (`pump_db` oluşturulmuş olmalı):

```bash
chmod +x /root/pump-setup/vm-setup.sh
/root/pump-setup/vm-setup.sh
```

---

## 7. Faydalı komutlar

### VM

```bash
sudo -u postgres psql -d pump_db -c "SELECT * FROM indexer_state;"
sudo -u postgres psql -d pump_db -c "\dt"
journalctl -u pump-indexer -n 50 --no-pager
journalctl -u pump-airdrop-keeper -n 50 --no-pager
cd /var/www/pump/Indexer && npm run sync-king      # KOTH backfill (bir kez)
cd /var/www/pump/Indexer && npm run sync-missions # puan backfill (bir kez)
```

### Local

```powershell
# Tunnel açıkken API testi
Invoke-WebRequest http://localhost:3012/api/tokens -UseBasicParsing
```

---

## Notlar

- Local `.env` → sadece TMA. Indexer/keeper → `indexer/.env.example` şablonu, VM'de `/var/www/pump/Indexer/.env`.
- `schema.sql` → VM şema referansı; Bölüm 2 ile güncelle.
- Graduation keeper BSC pump'ta **kullanılmaz**.
- `zugchain-configuration/tma` artık kullanılmıyor; tüm geliştirme bu repoda.
- Foundry build için `contracts/remappings.txt` → `zugchain-configuration/latest-uniswap/lib` (sadece forge kütüphaneleri, `tma` klasörü değil).

---

## 8. GitHub

Repo: [github.com/CadaFinance/pump](https://github.com/CadaFinance/pump.git)

```powershell
cd C:\Users\DARK\Desktop\zugchain-pump-tma
git init
git add .
git status   # .env ve node_modules listede OLMAMALI
git commit -m "Initial commit: BSC pump TMA, indexer, contracts"
git branch -M main
git remote add origin https://github.com/CadaFinance/pump.git
git push -u origin main
```

Zaten `git init` yapıldıysa sadece:

```powershell
git remote add origin https://github.com/CadaFinance/pump.git
git add .
git commit -m "Initial commit: BSC pump TMA, indexer, contracts"
git push -u origin main
```

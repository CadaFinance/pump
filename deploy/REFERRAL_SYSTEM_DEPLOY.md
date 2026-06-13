# Referral System — Kontrat + VM Deploy Rehberi

Referral özelliği **yeni BondingCurveManager** gerektirir. Mevcut tokenlar eski bonding contract'ta kalır (testnet reset kabul edilebilir).

**VM:** `104.207.64.115` · SSH port `22022`  
**Mevcut testnet adresleri:** [`contracts/deployments/bsc-testnet-pump.json`](../contracts/deployments/bsc-testnet-pump.json)

---

## A) Local — Forge (ayrı terminal)

### A0. Ön koşul

- Foundry kurulu (`forge`, `cast`)
- BSC Testnet BNB (deploy + tx gas)
- `DEPLOYER_PRIVATE_KEY` = MemeFactory **owner** wallet (şu an `0x11Ea71d1BEb04Aece4d06a585D9dbc6F58836880`)

### A1. Repo + test

```powershell
cd C:\Users\DARK\Desktop\pump-tma\contracts

forge test -vv
```

### A2. BondingCurve redeploy + MemeFactory wire

```powershell
cd C:\Users\DARK\Desktop\pump-tma\contracts

$env:DEPLOYER_PRIVATE_KEY="0x..."   # owner private key — dosyaya YAZMA
$env:BSC_TESTNET_RPC="https://bsc-testnet-rpc.publicnode.com"

forge script script/DeployBondingCurveReferral.s.sol:DeployBondingCurveReferral `
  --rpc-url $env:BSC_TESTNET_RPC `
  --broadcast `
  -vvv
```

Script otomatik olarak [`bsc-testnet-pump.json`](../contracts/deployments/bsc-testnet-pump.json) dosyasını günceller.

Çıktıdan not al (VM için):

- `new BondingCurveManager: 0x...`
- `deploymentBlock: ...`

### A3. Push

```powershell
cd C:\Users\DARK\Desktop\pump-tma

git add contracts/deployments/bsc-testnet-pump.json contracts/script/DeployBondingCurveReferral.s.sol deploy/
git commit -m "chore: referral bonding deploy script and VM guide"
git push origin main
```

> GitHub Actions sadece **TMA** deploy eder. Indexer + migration + `.env` VM'de manuel.

### A4. (Opsiyonel) BscScan verify

```powershell
cd C:\Users\DARK\Desktop\pump-tma\contracts

$env:BSCSCAN_API_KEY="..."
$env:OWNER="0x11Ea71d1BEb04Aece4d06a585D9dbc6F58836880"
$env:DEPLOYER="0x11Ea71d1BEb04Aece4d06a585D9dbc6F58836880"
$env:TREASURY="0x9EFE93b528800aF08d0EA3033135B3D5964cc7b7"
$env:BONDING="0xYENI_BONDING"
$env:FACTORY="0x2Fa07dFd25f1C2F3E2C0b6084bc5e0b87c9997A2"
$env:LENS="0xYENI_LENS"
$env:MEME_IMPL="0x458b760c6B110787ea789fb8a5183D6C1cC89fEC"

bash script/verify-bsc-testnet.sh
```

---

## B) VM — Push sonrası adımlar

SSH:

```powershell
ssh -p 22022 root@104.207.64.115
```

### B0. Hızlı script (migration + registry + indexer sync)

```bash
export NEW_BONDING=0xYENI_BONDING
export NEW_BLOCK=123456789
chmod +x /var/www/pump/tma/deploy/vm/referral-post-deploy.sh
bash /var/www/pump/tma/deploy/vm/referral-post-deploy.sh
```

Sonra manuel: `.env` bonding adresi + `tma-deploy.sh` + indexer `INDEXER_START_BLOCK` + restart.

### B1. TMA `.env` — yeni bonding adresi

```bash
cd /var/www/pump/tma
git pull origin main

nano .env
# Değiştir:
# NEXT_PUBLIC_BONDING_CURVE_MANAGER=0xYENI_BONDING
```

`NEXT_PUBLIC_*` build-time olduğu için **mutlaka rebuild**:

```bash
./deploy/tma-deploy.sh
```

veya CI bitene kadar bekle (main push sonrası otomatik).

### B2. DB migration 004 + 005 (henüz uygulanmadıysa)

```bash
cd /var/www/pump/tma

sudo -u postgres psql -d pump_db -f db/migrations/004_admin_link_tasks.sql
sudo -u postgres psql -d pump_db -f db/migrations/005_referral_system.sql
```

Doğrula:

```bash
sudo -u postgres psql -d pump_db -c "\d referral_bindings"
sudo -u postgres psql -d pump_db -c "\d referrer_fee_claims"
sudo -u postgres psql -d pump_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='trades' AND column_name='referrer_fee_zug';"
```

### B3. `contract_registry` — indexer bonding adresi

```bash
sudo -u postgres psql -d pump_db -c "
UPDATE contract_registry
SET address = '0xYENI_BONDING',
    deployment_block_number = YENI_BLOCK,
    updated_at = now()
WHERE contract_key = 'bonding_curve_manager';
"

sudo -u postgres psql -d pump_db -c "
SELECT contract_key, address, deployment_block_number, is_active
FROM contract_registry
WHERE contract_key IN ('meme_factory', 'bonding_curve_manager');
"
```

### B4. Indexer kod + artifact sync

```bash
cd /var/www/pump/tma
git pull origin main

# Indexer kaynak ( .env SİLME — --exclude kullan )
rsync -a --exclude '.env' --exclude 'node_modules' indexer/ /var/www/pump/Indexer/

# Forge artifact — yeni BondingCurveManager ABI
mkdir -p /var/www/pump/contracts
rsync -a --exclude 'cache' --exclude 'broadcast' \
  /var/www/pump/tma/contracts/out/ /var/www/pump/contracts/out/

cd /var/www/pump/Indexer
npm ci
npm run build
```

Indexer `.env` güncelle:

```bash
nano /var/www/pump/Indexer/.env
```

```env
# Yeni bonding deploy block - 1 (eski eventleri tekrar taramamak için)
INDEXER_START_BLOCK=YENI_BLOCK_MINUS_1
CONTRACT_ARTIFACTS_DIR=/var/www/pump/contracts/out
```

> **Not:** Eski tokenlar eski bonding'de kaldığı için eski trade eventleri yeni contract'ta gelmez. Yeni tokenlar yeni bonding kullanır.

Restart:

```bash
systemctl restart pump-indexer pump-airdrop-keeper
journalctl -u pump-indexer -n 30 --no-pager
```

### B5. Health check

```bash
pm2 status
curl -sf http://127.0.0.1:3012/api/health && echo " TMA OK"

sudo -u postgres psql -d pump_db -c "SELECT * FROM indexer_state;"
```

### B6. (Opsiyonel) schema.sql güncelle — local'den

PowerShell (local):

```powershell
cd C:\Users\DARK\Desktop\pump-tma
ssh -p 22022 root@104.207.64.115 "sudo -u postgres pg_dump -d pump_db --schema-only --no-owner --no-privileges" | Out-File -FilePath schema.sql -Encoding utf8
git add schema.sql db/migrations/
git commit -m "chore: sync schema after referral migration"
git push origin main
```

---

## C) Deploy sonrası smoke test

1. Admin wallet → `/admin` → referrer share % görünüyor mu
2. Inviter link: `https://pump.zugchain.org/?ref=0xINVITER` (veya local `?ref=0x...`)
3. Yeni wallet connect → banner → `setReferrer` tx
4. Invitee ile **yeni token** üzerinde trade
5. Inviter portfolio → Referral rewards → pending BNB > 0
6. Claim → BNB wallet'a gelir

---

## D) Sıra özeti

| # | Nerede | Ne |
|---|--------|-----|
| 1 | Local | `forge test` |
| 2 | Local | `DeployBondingCurveReferral` broadcast |
| 3 | Local | `bsc-testnet-pump.json` güncelle + push |
| 4 | VM | `NEXT_PUBLIC_BONDING_CURVE_MANAGER` + `tma-deploy.sh` |
| 5 | VM | migration 004 + 005 |
| 6 | VM | `contract_registry` UPDATE |
| 7 | VM | indexer rsync + artifacts + `INDEXER_START_BLOCK` + restart |
| 8 | Both | smoke test |

---

## E) Önemli uyarılar

- **Fee cinsi:** Trade fee'ler **native BNB** (kodda `zug`/`feeZug` isimlendirmesi tarihsel).
- **Eski tokenlar:** Eski bonding contract'ta kalır; referral sadece **yeni deploy sonrası oluşturulan tokenlarda** ve yeni trade'lerde aktif olur.
- **Private key:** Shell env'de tut; `.env` veya git'e commit etme.
- **Indexer `.env`:** `rsync --delete` kullanma; `.env` silinir.

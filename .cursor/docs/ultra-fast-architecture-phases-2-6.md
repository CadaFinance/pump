# Pump Ultra-Fast Architecture — Faz 2–6 (Haziran 2026)

Araştırma özeti: kurumsal ölçekli uygulamalardan (Binance, DexScreener, Tradovate, Coinbase-style EDA) öğrenilenler, **tek VM** (`104.207.64.115`) için uyarlanmış yol haritası.

**Slogan sözleşmesi**

| Vaat | Teknik anlamı | Ölçüm |
|------|---------------|--------|
| **0 ms hissi** | İlk paint SSR/PPR; canlı güncelleme WS delta | FCP < 200ms, WS→UI < 50ms P95 |
| **99.9% doğruluk** | Aynı fiyat semantiği her yüzeyde; quote≠fill açık etiketli | Quote-fill slippage içinde %99.9 |
| **Şeffaflık** | Mark / Quote / Fill ayrımı (Binance standardı) | Kullanıcı sürpriz görmez |

---

## 1. Kurumsal uygulamalar ne yapıyor?

### Binance / büyük borsalar

- **Last Price** — son işlem fiyatı (tape, mum kapanışı).
- **Mark Price** — adil değer (likidasyon, unrealized PnL); manipülasyona karşı.
- **Index Price** — çoklu borsa ağırlıklı spot.
- Kaynak: [Binance Mark vs Last Price FAQ](https://www.binance.info/en/support/faq/detail/360033525271)

Pump bonding curve için karşılık:

| Binance | Pump karşılığı | Kullanım |
|---------|----------------|----------|
| Mark Price | **Spot** (`spotPriceBnbFromBondingDecimals`) | Arena MCAP, chart, holders P/L |
| Last Price | **Fill** (`netBnb / tokens`) | Trade tape “Price” kolonu |
| Quote (order preview) | **Curve quote** (`quoteBuyFromCurveState`) | Trade panel “You receive” |

### DexScreener / aggregator tarzı

- Redis’te sıcak token snapshot → WS ile client push.
- REST/cron ile cache doldurma; WS sadece broadcast.
- Kaynak: [DexScreener WS API](https://docs.dexscreener.com/api/websockets), aggregator örnekleri (Redis + WS pattern).

### Tradovate / profesyonel chart

- Chart: **last trade** + DOM bid/ask.
- Emir öncesi: **quote** ayrı gösterilir; dolum **fill** ile tape’e düşer.
- Pump: bonding curve’de bid/ask yok; **spot** chart + **fill** tape yeterli.

### Veri katmanı (devasa DB’ler)

```
On-chain / OLTP writes
        ↓
   Indexer (CDC)
        ↓
┌───────┴───────┐
│ PostgreSQL    │  ← source of truth (trades, positions)
│ + MVs / IVM   │  ← pre-aggregated reads
└───────┬───────┘
        ↓
     Redis         ← hot cache + pub/sub (<5ms read)
        ↓
  WS gateway        ← fan-out to browsers
        ↓
   Next.js SSR     ← instant shell
```

**Tek VM için doğru seçim:** Redis Pub/Sub + Streams (mevcut) — **Kafka değil** (ops yükü, 5–50ms latency, gerek yok <~100M msg/gün).

Kaynaklar: [Redis vs Kafka (2026)](https://oneuptime.com/blog/post/2026-03-31-redis-streams-vs-kafka-detailed-comparison/view), [Redis Pub/Sub vs Streams](https://oneuptime.com/blog/post/2026-03-31-redis-when-to-use-redis-pubsub-vs-redis-streams/view).

### PostgreSQL MV stratejisi (2026)

- Native `REFRESH MATERIALIZED VIEW` = **full recompute** (bizde indexer trade başına çalışıyor — pahalı).
- **Hedef:** trade başına sadece etkilenen `token_address` satırını güncelle (incremental IVM).
- Gelecek: PostgreSQL 18 + [pg_trickle](https://github.com/trickle-labs/pg-trickle) (trigger/WAL CDC, sub-ms IVM) — VM PG sürümü yükselince değerlendir.
- Şimdilik: **indexer-side incremental update** (SQL UPSERT into MV tables veya normal tablolar) > full `REFRESH CONCURRENTLY`.

Kaynak: [Incremental MV guide (2026)](https://risingwave.com/blog/incremental-materialized-views-complete-guide/), [pg_trickle](https://pgxn.org/dist/pg_trickle/).

---

## 2. Mevcut durum (Faz 1 tamamlandı)

| Bileşen | Durum |
|---------|--------|
| Arena SSR | ✅ `fetchArenaHomePayload` |
| Token SSR | ✅ `fetchTokenDetailPayload` |
| Airdrops SSR | ✅ `fetchAirdropsListPayload` |
| WS arena delta | ✅ reserve-based MCAP patch |
| User bootstrap | ✅ `/api/user/bootstrap` (4→1 istek) |
| MVs | ✅ `mv_token_trade_stats`, `mv_token_price_anchors` |
| Redis pub/sub | ✅ `pump:board`, `pump:trade:*`, `pump:wallet:*` |
| Mark price unify | ✅ `resolveMarkPriceBnb`, chart spot replay |

**Eksikler (Faz 2–6):** Portfolio SSR, chart/holders bundle, incremental MV, Redis board cache, tüm sayfalarda WS delta, Next.js 16 PPR, fiyat semantiği UI sözleşmesi.

---

## 3. Faz 2 — Anında sayfa açılışı (1–2 hafta)

**Hedef:** Her route’ta skeleton yok; HTML ile içerik.

### 2.1 SSR genişletme

| Route | İş | DB yükü |
|-------|-----|---------|
| `/portfolio` | Wallet cookie veya `?address=` ile `getPortfolioForAddress` SSR | 1 sorgu |
| `/token/[addr]` | Chart trades + holders tek payload (`fetchTokenDetailBundle`) | 3→1 round-trip |
| `/airdrops/[id]` | `getAirdropById` SSR header | 1 sorgu |
| `/missions` | Static mission defs SSR; progress client | minimal |

### 2.2 Next.js 16 Cache Components + PPR

```ts
// next.config.ts (planlanan)
const nextConfig = {
  cacheComponents: true,
};
```

- `'use cache'` + `cacheLife('seconds')` arena board snapshot (2s).
- `cacheTag('arena')` — indexer trade sonrası `revalidateTag` (server action veya internal API).
- Kaynak: [Next.js 16 Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)

### 2.3 Client SWR standardı

- **Asla** `setData(null)` filter değişiminde.
- `placeholderData: keepPreviousData` (TanStack Query) tüm listelerde.
- Poll sadece WS kopukken (`resolveLivePollDelay` — mevcut).

**VM etkisi:** DB read −40% (SSR + cache); aynı anda daha çok kullanıcı.

---

## 4. Faz 3 — DB yükünü minimize et (indexer write-path)

**Hedef:** Arena list sorgusu < 50ms P95; trade başına O(1) indexer işi.

### 3.1 Incremental stats (MV yerine veya MV üstüne)

Trade insert sonrası indexer zaten çalışıyor — ekle:

```sql
-- Örnek: token_board_stats tablosu (normal table, indexed)
UPDATE token_board_stats SET
  trade_count = trade_count + 1,
  volume_24h_zug = ...,  -- rolling window veya periodic trim
  market_cap_zug = $spot * 1e9,
  last_price_zug = $spot,
  updated_at = now()
WHERE token_address = $1;
```

- Arena `listArenaBoardTokens` → `JOIN token_board_stats` (LATERAL trade aggregation **yok**).
- `REFRESH MATERIALIZED VIEW` sadece **nightly reconcile** (drift düzeltme).

### 3.2 Redis hot cache (minimum RAM)

| Key | TTL | İçerik |
|-----|-----|--------|
| `board:new:50` | 2s | JSON token list (new filter default) |
| `token:{addr}:snapshot` | 5s | MCAP, spot, vol, % changes |
| `bnb:usd` | 30s | Binance ticker (UI + SSR paylaşır) |

- API route: Redis hit → return; miss → PG → set Redis.
- Indexer: trade sonrası `SET token:{addr}:snapshot` + `DEL board:*` (invalidation).
- `maxmemory 256–512mb`, `allkeys-lru` — VM için yeterli.

### 3.3 Indexer publish zenginleştirme

WS payload (her trade):

```json
{
  "type": "trade",
  "tokenAddress": "0x...",
  "bonding": {
    "reserveZug", "tokenSold", "spotPriceZug", "marketCapBnb",
    "change24hPct", "tradeCount", "holderCount"
  },
  "trade": { ... }
}
```

- Client **asla** ham `market_cap_zug` kolonuna güvenmez (Faz 1 fix).
- `% change` indexer’da hesaplanır → client’ta LATERAL yok.

**VM etkisi:** PG CPU −60% peak; Redis +2–5ms latency.

---

## 5. Faz 4 — WS delta her yerde

| Room | Delta tipi | Full refetch |
|------|------------|--------------|
| `arena` | `trade` → row patch | KOTH, filter change |
| `token:{addr}` | `trade` → chart bar + tape row + header spot | interval change |
| `wallet:{addr}` | `wallet_trade` → portfolio row patch | connect |

### Redis mimarisi (mevcut + küçük ekleme)

```
Indexer --publish--> Redis Pub/Sub (pump:board, pump:trade:*)
                         ↓
                  pump-realtime (Node WS)
                         ↓
                    Browser rooms
```

İleride (opsiyonel): kritik eventler için **Redis Streams** (`XADD pump:events`) — replay/debug; Pub/Sub canlı UI için kalır.

**Bağlantı başına VM:** `MAX_CONNECTIONS=2000` (mevcut). 2000+ için `pump-realtime` cluster mode (2 worker) — aynı VM.

---

## 6. Faz 5 — 99.9% doğruluk & chart (kritik)

### 6.1 Üç fiyat kuralı (kod sözleşmesi)

| Tip | Hesap | UI yüzeyi | Etiket |
|-----|-------|-----------|--------|
| **Spot** | `spotPriceBnbFromBondingDecimals` | Arena, header, chart, holders | — |
| **Quote** | `quoteBuy/SellFromCurveState` + slippage | Trade panel “You receive”, min received | **Est.** |
| **Fill** | `tradeFillPriceBnb(net, tokens)` | Trade tape Price | — |

**Yasak:** Quote’u tape’de göstermek veya fill’i board MCAP’te kullanmak.

### 6.2 $0.10 gösterip $0.11 dolum sorunu

**Kök neden:** Küçük trade’lerde execution price ≠ marginal spot; slippage + fee.

**Çözüm (Binance/Tradovate standardı):**

1. Trade panel: **“Est. price ~$X”** + **“Min received”** (slippage bps — mevcut `SLIPPAGE_BPS`).
2. Onay öncesi: quote = curve simulation at **current block**; label “Estimated”.
3. Tape: her zaman **fill** (`formatTradeFillPriceUsd` — mevcut).
4. Chart: **spot replay** (`buildTradeSpotTicks` — mevcut).
5. Post-trade: optimistic row tape’de fill ile; chart spot tick ekler.
6. **99.9% metrik:** `|fill - quote| / quote ≤ slippage_tolerance` — log + alert if violated.

### 6.3 Chart kurumsal standart

| Özellik | Binance/Tradovate | Pump hedef |
|---------|-------------------|------------|
| Mum kaynağı | Last trade | **Spot** (wick manipülasyonu yok) |
| Canlı mum | WS tick | WS `trade` → son bar update |
| Senkron | Chart = tape aynı semantik | Chart spot, tape fill (etiketli) |
| Zoom/interval | Client-side aggregate | `CANDLE_INTERVALS` (mevcut) |

### 6.4 Tek kaynak dosyalar

- `src/lib/bonding-curve.ts` — curve math
- `src/lib/mark-price.ts` — spot resolution priority
- `src/lib/format-usd.ts` — `tradeFillPriceBnb`, `formatTradeFillPriceUsd`
- `src/lib/candles.ts` — spot replay
- **Yeni (Faz 5):** `src/lib/price-semantics.ts` — tipler + `labelForSurface()`

---

## 7. Faz 6 — Ölçek emniyeti (aynı VM, sonra split)

### Ne zaman?

| Metrik | Tek VM yeter | Split gerek |
|--------|--------------|-------------|
| Eşzamanlı WS | < 2000 | > 2000 |
| Trade/saniye | < 50 | > 200 |
| PG boyutu | < 100GB | > 500GB |
| Arena P95 | < 100ms | > 300ms |

### Aynı VM optimizasyonları (önce bunlar)

1. **PgBouncer** transaction mode — connection pool (Next.js + indexer).
2. **PG tuning:** `shared_buffers=25%RAM`, `effective_cache_size=75%RAM`, `work_mem` düşük.
3. **Partial indexes** — `bonding_states` MCAP, `trades(token, block_time DESC)`.
4. **pm2:** `pump-tma` 2 instance + nginx upstream (sticky WS hariç).

### Split (gelecek, gerekirse)

- DB read replica (arena read-only) — primary VM’de kalabilir başlangıçta.
- **Kafka:** sadece >1M event/gün ve multi-service — şimdilik **hayır**.

---

## 8. Uygulama önceliği (etki / VM yükü)

| # | İş | Etki | VM DB | Faz |
|---|-----|------|-------|-----|
| 1 | `token_board_stats` incremental indexer | Çok yüksek | −60% | 3 |
| 2 | Redis board/token cache | Yüksek | −40% | 3 |
| 3 | Portfolio SSR | Yüksek | +1 read/visit | 2 |
| 4 | Token bundle SSR (chart+holders) | Yüksek | −2 RT/client | 2 |
| 5 | Price semantics UI labels | Doğruluk | 0 | 5 |
| 6 | `cacheComponents` + `use cache` arena | Orta | −20% | 2 |
| 7 | Token WS chart delta | Orta | −poll | 4 |
| 8 | Next.js `revalidateTag` on trade | Orta | cache hit | 2 |
| 9 | pg_trickle (PG 18+) | Gelecek | −80% MV | 6+ |

---

## 9. Ortam değişkenleri (prod checklist)

```env
# UI
USE_MV_TOKEN_STATS=true
USE_BONDING_STATE_COUNTS=true
NEXT_PUBLIC_WS_ENABLED=true

# Indexer
MV_REFRESH_ENABLED=true          # nightly reconcile
REDIS_PUBLISH_ENABLED=true
INCREMENTAL_BOARD_STATS=true     # (Faz 3 — eklenecek)

# Redis
maxmemory 512mb
maxmemory-policy allkeys-lru

# realtime
MAX_CONNECTIONS=2000
ALLOWED_ORIGINS=http://104.207.64.115
```

---

## 10. Başarı metrikleri (izlenecek)

```text
# Prometheus / basit log
arena_ssr_ttfb_ms          P95 < 150
arena_ws_patch_latency_ms  P95 < 50
api_tokens_p95_ms          < 80 (Redis hit < 10)
quote_fill_deviation_bps   P99 < SLIPPAGE_BPS + 50
board_mcap_ws_api_drift    < 0.1%
```

---

## 11. Bilinçli olarak YAPILMAYACAKLAR (tek VM)

- ❌ Kafka cluster — ops maliyeti, latency
- ❌ ClickHouse / TimescaleDB — erken; PG + Redis yeterli
- ❌ RisingWave/Materialize ayrı servis — VM RAM yetmez
- ❌ Her trade’de full MV refresh — CPU öldürür
- ❌ Client-only sayfalar — slogan ile çelişir

---

## 12. Sonraki kod adımı (önerilen sıra)

1. **Faz 5 hızlı kazanım:** Trade panel “Est.” etiketleri + `price-semantics.ts`
2. **Faz 3:** `token_board_stats` migration + indexer incremental
3. **Faz 2:** Portfolio SSR + token bundle
4. **Faz 2:** `cacheComponents: true` in `next.config.ts`
5. **Faz 4:** Token page WS chart bar patch

---

*Son güncelleme: Haziran 2026. Araştırma kaynakları: Binance docs, DexScreener WS, Next.js 16 blog, Redis/Kafka karşılaştırmaları (OneUptime/AutoMQ 2026), pg_trickle/PG IVM literatürü.*

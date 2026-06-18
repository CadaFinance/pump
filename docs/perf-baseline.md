# Performans baseline log

Haftalık ölçüm kayıtları. Komutlar ve SLO eşikleri: [`ops-perf-playbook.md`](./ops-perf-playbook.md).

---

## 2026-06-18

**Kaynak:** SSH `system-health.sh` + public curl + `phase-0-observability.sh`

| Metrik | Değer |
|--------|-------|
| overall (health script) | degraded *(indexer log parse — indexer OK)* |
| CPU | 1% · 8 cores |
| RAM | 14% · 6.8 GB available |
| `/api/health` public | ~2.2 ms |
| `/api/tokens` public | ~2.1 ms |
| WS smoke 1 conn | 14 ms |
| PG connections | 13 |
| PM2 | 2× tma + 2× realtime |
| PgBouncer | active :6432 |
| Indexer | watchBlocks · blocks indexing live |

**Karar:** Tier 3 yeterli. Zero / Edge WS / PG 18 → ertele. Haftalık ritüel başlat.

---

## Eski pg_stat_statements dump (2026-03 öncesi)

```
 calls | mean_ms |                                     query                                      
-------+---------+--------------------------------------------------------------------------------
     5 |    1.18 | WITH base_tokens AS (                                                         +
...
```

*(Tam dump aşağıda arşiv — yeni ölçümler yukarıya ekle.)*

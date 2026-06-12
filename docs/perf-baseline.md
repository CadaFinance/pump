# Performance baseline

Record metrics before/after each phase deploy on VM.

## How to capture

```bash
bash deploy/vm/phase-0-observability.sh
```

## Template (fill after each phase)

| Metric | Phase 0 | Phase 1 | Phase 2 | Phase 4+ |
|--------|---------|---------|---------|----------|
| `/api/health` time_total (s) | | | | |
| `/api/tokens` time_total (s) | | | | |
| PG active connections | | | | |
| Top slow query mean_ms | | | | |

## Notes

- Run during similar load (idle vs peak) for fair comparison.
- After Phase 0, `pg_stat_statements` must show queries (requires `shared_preload_libraries`).

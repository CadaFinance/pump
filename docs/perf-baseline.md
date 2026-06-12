calls | mean_ms |                                     query                                      
-------+---------+--------------------------------------------------------------------------------
     5 |    1.18 | WITH base_tokens AS (                                                         +
       |         |                                                                               +
       |         |       SELECT                                                                  +
       |         |         t.address,                                                            +
       |         |         t.symbol,                                                             +
       |         |         t.name,                                                               +
       |         |         t.creator_address
    24 |    0.71 | WITH base_tokens AS (                                                         +
       |         |                                                                               +
       |         |       SELECT                                                                  +
       |         |         t.address,                                                            +
       |         |         t.symbol,                                                             +
       |         |         t.name,                                                               +
       |         |         t.creator_address
     2 |    0.41 | SELECT a.id, a.on_chain_id, a.rules_json, a.reward_token, a.total_funded,     +
       |         |              a.status, a.merkle_root, a.claim_
     2 |    0.39 | SELECT a.id, a.on_chain_id, a.creator_address, a.linked_token, a.reward_token,+
       |         |              a.total_funded, a.rules_json
     9 |    0.20 | SELECT                                                                        +
       |         |         tr.event_id,                                                          +
       |         |         tr.tx_hash,                                                           +
       |         |         tr.block_time,                                                        +
       |         |         tr.token_address,                                                     +
       |         |         tr.zug_amount::
     1 |    0.20 | SELECT count(*) AS active FROM pg_stat_activity WHERE datname=$1
     3 |    0.19 | CREATE EXTENSION IF NOT EXISTS pg_stat_statements
     1 |    0.14 | SELECT calls, round(mean_exec_time::numeric,$1) AS mean_ms, left(query,$2)    +
       |         | FROM pg_stat_statements ORDER BY mean_exec_ti
     9 |    0.12 | SELECT                                                                        +
       |         |           t.task_key,                                                         +
       |         |           t.title,                                                            +
       |         |           t.description,                                                      +
       |         |           t.reward_points,                                                    +
       |         |           t.task_kin
   144 |    0.12 | SELECT                                                                        +
       |         |       recent.id::text,                                                        +
       |         |       recent.side,                                                            +
       |         |       recent.trader_address,                                                  +
       |         |       recent.zug_amount::text,                                                +
       |         |       recen
     5 |    0.12 | SELECT                                                                        +
       |         |           kh.token_address,                                                   +
       |         |           t.symbol,                                                           +
       |         |           t.name,                                                             +
       |         |           t.logo_url,                                                         +
       |         |           kh.crowned_at,                                                      +
       |         | 
     9 |    0.12 | INSERT INTO users (address, last_active)                                      +
       |         |       VALUES ($1, now())                                                      +
       |         |       ON CONFLICT (address) DO UPDATE SET last_active 
    24 |    0.11 | SELECT                                                                        +
       |         |           p.token_address,                                                    +
       |         |           t.symbol,                                                           +
       |         |           t.name,                                                             +
       |         |           t.logo_url,                                                         +
       |         |           t.status,                                                           +
       |         |       
    24 |    0.09 | SELECT                                                                        +
           |         |         t.address,                                                            +
       |         |         t.symbol,                                                             +
       |         |         t.name,                                                               +
       |         |         t.logo_url,                                                           +
       |         |         COALESCE(b.last_price_zug, $1)::
     5 |    0.08 | SELECT kh.token_address, kh.crowned_at                                        +
       |         |         FROM king_history kh                                                  +
       |         |         JOIN tokens t ON t.address = kh.token_addres
(15 rows)
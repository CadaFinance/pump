-- Saved airdrop campaigns (bookmark, wallet-scoped — like token_favorites)
CREATE TABLE IF NOT EXISTS airdrop_saves (
  user_address text NOT NULL,
  airdrop_id bigint NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (user_address = lower(user_address)),
  PRIMARY KEY (user_address, airdrop_id),
  FOREIGN KEY (airdrop_id) REFERENCES airdrops(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_airdrop_saves_user
  ON airdrop_saves (user_address, created_at DESC);

-- Participation list queries (My campaigns)
CREATE INDEX IF NOT EXISTS idx_airdrop_participants_address_updated
  ON airdrop_participants (address, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_airdrop_participants_address_onchain
  ON airdrop_participants (address, first_onchain_at DESC)
  WHERE first_onchain_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_airdrop_allocations_address
  ON airdrop_allocations (address, created_at DESC);

-- Indexer: match trades to active qualify windows by linked token
CREATE INDEX IF NOT EXISTS idx_airdrops_linked_token_qualify
  ON airdrops (linked_token, qualify_start, qualify_end);

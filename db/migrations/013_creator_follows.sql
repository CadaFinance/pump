-- Creator follow graph (idempotent for VMs that predate schema.sql sync)
CREATE TABLE IF NOT EXISTS public.creator_follows (
  follower_address text NOT NULL,
  creator_address text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT creator_follows_check CHECK ((follower_address <> creator_address)),
  CONSTRAINT creator_follows_creator_address_check CHECK ((creator_address = lower(creator_address))),
  CONSTRAINT creator_follows_follower_address_check CHECK ((follower_address = lower(follower_address)))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creator_follows_pkey'
  ) THEN
    ALTER TABLE ONLY public.creator_follows
      ADD CONSTRAINT creator_follows_pkey PRIMARY KEY (follower_address, creator_address);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_creator_follows_creator
  ON public.creator_follows (creator_address);

CREATE INDEX IF NOT EXISTS idx_creator_follows_follower
  ON public.creator_follows (follower_address, created_at DESC);

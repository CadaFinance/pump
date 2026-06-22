-- Google / Apple OIDC → Kernel SCW (parallel to telegram_wallets; non-destructive add)
CREATE TABLE IF NOT EXISTS public.oauth_wallets (
  provider text NOT NULL,
  subject text NOT NULL,
  email text,
  display_name text,
  eoa_address text NOT NULL,
  scw_address text NOT NULL,
  encrypted_private_key text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT oauth_wallets_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'apple'::text]))),
  CONSTRAINT oauth_wallets_eoa_address_check CHECK ((eoa_address = lower(eoa_address))),
  CONSTRAINT oauth_wallets_scw_address_check CHECK ((scw_address = lower(scw_address)))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'oauth_wallets_pkey'
  ) THEN
    ALTER TABLE ONLY public.oauth_wallets
      ADD CONSTRAINT oauth_wallets_pkey PRIMARY KEY (provider, subject);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_wallets_scw
  ON public.oauth_wallets (scw_address);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_wallets_eoa
  ON public.oauth_wallets (eoa_address);

CREATE INDEX IF NOT EXISTS idx_oauth_wallets_email
  ON public.oauth_wallets (lower(email))
  WHERE email IS NOT NULL;

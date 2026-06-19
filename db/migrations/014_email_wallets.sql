-- Email → Kernel SCW mapping (EOA signer stored encrypted server-side)
CREATE TABLE IF NOT EXISTS public.email_wallets (
  email text NOT NULL,
  eoa_address text NOT NULL,
  scw_address text NOT NULL,
  encrypted_private_key text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT email_wallets_email_check CHECK ((email = lower(email))),
  CONSTRAINT email_wallets_eoa_address_check CHECK ((eoa_address = lower(eoa_address))),
  CONSTRAINT email_wallets_scw_address_check CHECK ((scw_address = lower(scw_address)))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_wallets_pkey'
  ) THEN
    ALTER TABLE ONLY public.email_wallets
      ADD CONSTRAINT email_wallets_pkey PRIMARY KEY (email);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_wallets_scw
  ON public.email_wallets (scw_address);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_wallets_eoa
  ON public.email_wallets (eoa_address);

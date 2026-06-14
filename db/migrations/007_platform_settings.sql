-- Off-chain platform settings (admin-editable, no contract redeploy)

CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO platform_settings (key, value)
VALUES ('min_initial_buy_bnb', '0.01')
ON CONFLICT (key) DO NOTHING;

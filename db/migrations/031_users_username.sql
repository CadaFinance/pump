-- Custom portfolio username (case-insensitive unique, Twitter-style).
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_check;
ALTER TABLE users ADD CONSTRAINT users_username_check
  CHECK (username IS NULL OR username = lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON public.users (username)
  WHERE username IS NOT NULL;

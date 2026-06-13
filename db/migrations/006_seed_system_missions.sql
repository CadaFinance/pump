-- 5 sabit system mission — launchpad_tasks boşsa (wipe sonrası) yeniden ekler.
-- Idempotent: task_key varsa reward_points / metinler güncellenir.

INSERT INTO launchpad_tasks (
  task_key, title, description, reward_points, task_kind, task_source, is_active
) VALUES
  (
    'LAUNCHPAD_DAILY_SWAP',
    'Daily Swap',
    'Complete one buy or sell on any meme today (UTC).',
    20,
    'DAILY',
    'system',
    true
  ),
  (
    'LAUNCHPAD_DEPLOY_MEME',
    'Launch Your Meme',
    'Create your own testnet token on the pump.',
    200,
    'ONE_TIME',
    'system',
    true
  ),
  (
    'LAUNCHPAD_FIRST_SMART_BUY',
    'First Smart Buy',
    'Buy at least 0.01 BNB of any meme token.',
    100,
    'ONE_TIME',
    'system',
    true
  ),
  (
    'LAUNCHPAD_VOLUME_MONSTER',
    'Volume Monster',
    'Reach 1 BNB in cumulative trading volume.',
    300,
    'MILESTONE',
    'system',
    true
  ),
  (
    'LAUNCHPAD_KING_OF_HILL',
    'King of the Hill',
    'Hold the #1 market cap among bonding tokens as creator.',
    350,
    'MILESTONE',
    'system',
    true
  )
ON CONFLICT (task_key) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_points = EXCLUDED.reward_points,
  task_kind = EXCLUDED.task_kind,
  task_source = EXCLUDED.task_source,
  is_active = EXCLUDED.is_active,
  updated_at = now();

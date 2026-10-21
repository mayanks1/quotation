-- =========================================================================
-- SUPABASE PG_CRON SCHEDULE: AUTOMATED WEEKLY LEDGER EMAIL
-- =========================================================================
-- This schedules the Edge Function to run automatically every Monday at 9:00 AM IST (03:30 AM UTC)

-- 1. Enable required Supabase extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule the weekly job
-- Cron format: (minute hour day-of-month month day-of-week)
-- '30 3 * * 1' = Every Monday at 03:30 UTC = 09:00 AM IST
SELECT cron.schedule(
  'weekly-tisha-ledger-email-summary',
  '30 3 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://dsyicahqdiavaidsjmvl.supabase.co/functions/v1/send-weekly-ledger-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);

-- =========================================================================
-- HELPER COMMANDS FOR TESTING & MONITORING
-- =========================================================================

-- View all active cron jobs:
-- SELECT * FROM cron.job;

-- View execution history/logs of the cron job:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Trigger the job immediately for testing:
-- SELECT net.http_post(
--   url := 'https://dsyicahqdiavaidsjmvl.supabase.co/functions/v1/send-weekly-ledger-summary',
--   headers := '{"Content-Type": "application/json"}'::jsonb
-- );

-- To unschedule/remove the cron job if needed:
-- SELECT cron.unschedule('weekly-tisha-ledger-email-summary');

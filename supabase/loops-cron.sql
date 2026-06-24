-- Schedule for the automation loops (applied to the aventary Supabase project).
-- This is a REFERENCE of what was set up via the dashboard/MCP — the real secret
-- lives in Supabase Vault, never in git.
--
-- Prereqs (already applied via migrations):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
-- 1. Store the shared secret in Vault (value generated once, kept out of git):
--    select vault.create_secret('<random-secret>', 'loops_dispatch_secret',
--      'Shared secret for the loops-dispatch edge function');
--    Then set the SAME value as the edge function secret:
--      supabase secrets set LOOPS_DISPATCH_SECRET=<random-secret>
--
-- 2. Daily job — runs at 14:00 UTC, just after the 13:00 UTC Morning Brief:
select cron.schedule(
  'loops-daily-content',
  '0 14 * * *',
  $job$
  select net.http_post(
    url := 'https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/loops-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-loops-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'loops_dispatch_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);

-- Inspect / manage:
--   select jobid, schedule, jobname, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select cron.unschedule('loops-daily-content');

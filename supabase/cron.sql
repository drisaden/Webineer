-- Webineer automation scheduler (Supabase pg_cron + pg_net).
--
-- Reminders and follow-ups need a tick every few minutes. Vercel Hobby only allows daily
-- cron jobs (vercel.json keeps a daily safety-net tick), so run this once in the Supabase
-- SQL editor to call the tick endpoint every 5 minutes from the database instead.
-- Works on any Vercel plan. Re-running is safe.
--
-- 1. Replace the placeholder with the same value as CRON_SECRET in Vercel (never commit it).
-- 2. Run the whole script.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the secret in Supabase Vault (encrypted), not in the job definition.
do $setup$
begin
  if exists (select 1 from vault.secrets where name = 'webineer_cron_secret') then
    perform vault.update_secret((select id from vault.secrets where name = 'webineer_cron_secret'), 'REPLACE_WITH_CRON_SECRET');
  else
    perform vault.create_secret('REPLACE_WITH_CRON_SECRET', 'webineer_cron_secret');
  end if;
end
$setup$;

select cron.unschedule('webineer-tick') where exists (select 1 from cron.job where jobname = 'webineer-tick');

select cron.schedule(
  'webineer-tick',
  '*/5 * * * *',
  $job$
  select net.http_get(
    url := 'https://webineer.techraacademy.com/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'webineer_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

-- Check it: select * from cron.job_run_details order by start_time desc limit 10;
--           select status_code, content::text from net._http_response order by created desc limit 5;
-- Stop it:  select cron.unschedule('webineer-tick');

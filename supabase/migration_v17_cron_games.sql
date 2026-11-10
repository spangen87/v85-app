-- Migration v17: schemalagd hämtning av omgångar och odds var tionde minut.
-- Databasen anropar appens /api/cron/games (pg_cron + pg_net). Routen avgör
-- själv vad som är dags: nya omgångar hämtas, och odds uppdateras tätare ju
-- närmare start (lib/autoFetch.ts). Vercel Cron kör samma route en gång per
-- dygn som reserv (vercel.json).
--
-- Innan jobbet gör något måste två hemligheter läggas i Supabase Vault
-- (SQL Editor, körs en gång — skriv aldrig in dem i en fil):
--
--   select vault.create_secret('https://<appens adress>', 'app_url');
--   select vault.create_secret('<samma värde som CRON_SECRET i Vercel>', 'cron_secret');
--
-- Saknas de blir adressen null och anropet hoppas över.
-- Stänga av: select cron.unschedule('trava-games');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'trava-games';

select cron.schedule('trava-games', '*/10 * * * *', $job$
  select net.http_get(
    url := s.app_url || '/api/cron/games',
    headers := jsonb_build_object('Authorization', 'Bearer ' || s.cron_secret),
    timeout_milliseconds := 60000
  )
  from (
    select
      (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') as app_url,
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret') as cron_secret
  ) s
  where s.app_url is not null and s.cron_secret is not null;
$job$);

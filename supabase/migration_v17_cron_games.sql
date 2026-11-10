-- Migration v17: schemalagd hämtning av omgångar och odds var tionde minut.
-- Databasen anropar appens /api/cron/games (pg_cron + pg_net). Routen avgör
-- själv vad som är dags: nya omgångar hämtas, och odds uppdateras tätare ju
-- närmare start (lib/autoFetch.ts). Vercel Cron kör samma route en gång per
-- dygn som reserv (vercel.json).
--
-- Jobbet loggar in med en egen nyckel som skapas här. Nyckeln ligger i
-- Supabase Vault (cron_token) och appen känner bara igen dess SHA-256
-- (tabellen cron_tokens, lib/cronAuth.ts). Ingen hemlighet behöver kopieras
-- mellan Vercel och Supabase.
--
-- Appens adress läggs in en gång (SQL Editor):
--   select vault.create_secret('https://<appens adress>', 'app_url');
-- Saknas den hoppas anropet över.
--
-- Stänga av: select cron.unschedule('trava-games');
-- Byta nyckel: ta bort raden i cron_tokens och hemligheten cron_token, kör om.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Bara service-klienten läser tabellen: RLS på och inga policyer
create table if not exists cron_tokens (
  name text primary key,
  token_hash text not null,
  created_at timestamptz not null default now()
);
alter table cron_tokens enable row level security;

do $$
declare
  t text;
begin
  if not exists (select 1 from vault.secrets where name = 'cron_token') then
    t := encode(sha256((gen_random_uuid()::text || gen_random_uuid()::text)::bytea), 'hex');
    perform vault.create_secret(t, 'cron_token');
    insert into cron_tokens (name, token_hash) values ('pg_cron', encode(sha256(t::bytea), 'hex'))
      on conflict (name) do update set token_hash = excluded.token_hash, created_at = now();
  end if;
end $$;

select cron.unschedule(jobid) from cron.job where jobname = 'trava-games';

select cron.schedule('trava-games', '*/10 * * * *', $job$
  select net.http_get(
    url := s.app_url || '/api/cron/games',
    headers := jsonb_build_object('Authorization', 'Bearer ' || s.cron_token),
    timeout_milliseconds := 60000
  )
  from (
    select
      (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') as app_url,
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_token') as cron_token
  ) s
  where s.app_url is not null and s.cron_token is not null;
$job$);

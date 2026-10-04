-- Migration v15: ögonblicksbilder av odds och streck (issue #98, avsnitt 3.3).
-- En rad per start och hämtning (fetch-routen), så att det går att mäta hur
-- odds och streck ändras under dagen och hur tidigt systemförslagen blir
-- pålitliga. Skrivs med service-klienten; inloggade kan läsa.
-- race_id har ingen främmande nyckel: races raderas och skapas om vid varje
-- hämtning, och ögonblicksbilderna ska överleva det.

create table if not exists odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id) on delete cascade,
  race_id text not null,                 -- t.ex. "V85_2026-10-04_5_3_1"
  race_number integer not null,
  start_number integer not null,
  horse_id text,                         -- ATG horse id
  odds double precision,                 -- vinnarodds (decimal), null innan vinnarpoolen öppnat
  bet_distribution double precision,     -- streck i procent
  captured_at timestamptz not null default now()
);

create index if not exists idx_odds_snapshots_game on odds_snapshots(game_id, captured_at);
create index if not exists idx_odds_snapshots_race on odds_snapshots(race_id, start_number, captured_at);

alter table odds_snapshots enable row level security;

create policy "Inloggade kan läsa odds_snapshots" on odds_snapshots for select using (auth.role() = 'authenticated');
create policy "Service kan skriva odds_snapshots" on odds_snapshots for all using (auth.role() = 'service_role');

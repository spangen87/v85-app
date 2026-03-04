-- V85-app Supabase schema
-- Kör detta i Supabase Dashboard → SQL Editor

-- Aktivera UUID-extension
create extension if not exists "uuid-ossp";

-- Games (en V85-omgång)
create table games (
  id text primary key,          -- t.ex. "V85_2025-10-11"
  game_type text not null,      -- "V85"
  date date not null,
  track text,
  created_at timestamptz default now()
);

-- Races (ett lopp inom en omgång)
create table races (
  id text primary key,          -- t.ex. "V85_2025-10-11_1"
  game_id text references games(id) on delete cascade,
  race_number integer not null,
  distance integer,
  track_surface text
);

-- Horses (hästar, delas mellan omgångar)
create table horses (
  id text primary key,          -- ATG horse id
  name text not null,
  born_year integer,
  gender text,
  father text
);

-- Starters (en häst i ett lopp — huvudtabellen för analys)
create table starters (
  id uuid primary key default uuid_generate_v4(),
  race_id text references races(id) on delete cascade,
  horse_id text references horses(id),
  start_number integer,
  driver text,
  trainer text,
  odds float,
  -- Historisk statistik från ATG
  starts_total integer,
  wins_total integer,
  earnings_total float,
  starts_current_year integer,
  wins_current_year integer,
  best_time text,
  last_5_results jsonb,         -- [{"place":"1","date":"2025-09-28",...}, ...]
  -- Beräknat
  formscore float
);

-- Row Level Security — alla inloggade användare kan läsa, ingen kan skriva direkt
alter table games enable row level security;
alter table races enable row level security;
alter table horses enable row level security;
alter table starters enable row level security;

create policy "Inloggade kan läsa games" on games for select using (auth.role() = 'authenticated');
create policy "Inloggade kan läsa races" on races for select using (auth.role() = 'authenticated');
create policy "Inloggade kan läsa horses" on horses for select using (auth.role() = 'authenticated');
create policy "Inloggade kan läsa starters" on starters for select using (auth.role() = 'authenticated');

-- Service role (API-routes med service key) kan skriva
create policy "Service kan skriva games" on games for all using (auth.role() = 'service_role');
create policy "Service kan skriva races" on races for all using (auth.role() = 'service_role');
create policy "Service kan skriva horses" on horses for all using (auth.role() = 'service_role');
create policy "Service kan skriva starters" on starters for all using (auth.role() = 'service_role');

-- ============================================================
-- MIGRATION v2: Kör dessa i Supabase Dashboard → SQL Editor
-- ============================================================
-- Races
-- alter table races add column if not exists start_method text;
-- alter table races add column if not exists race_name text;
-- alter table races add column if not exists start_time timestamptz;

-- Starters (batch 1 — från förra migrationen)
-- alter table starters add column if not exists bet_distribution float;
-- alter table starters add column if not exists starts_prev_year integer;
-- alter table starters add column if not exists wins_prev_year integer;
-- alter table starters add column if not exists life_records jsonb;

-- Starters (batch 2 — ny statistik)
-- alter table starters add column if not exists post_position integer;
-- alter table starters add column if not exists driver_win_pct float;
-- alter table starters add column if not exists trainer_win_pct float;
-- alter table starters add column if not exists shoes_reported boolean;
-- alter table starters add column if not exists shoes_front boolean;
-- alter table starters add column if not exists shoes_back boolean;
-- alter table starters add column if not exists shoes_front_changed boolean;
-- alter table starters add column if not exists shoes_back_changed boolean;
-- alter table starters add column if not exists sulky_type text;
-- alter table starters add column if not exists horse_age integer;
-- alter table starters add column if not exists horse_sex text;
-- alter table starters add column if not exists horse_color text;
-- alter table starters add column if not exists pedigree_father text;
-- alter table starters add column if not exists home_track text;
-- alter table starters add column if not exists places_total integer;

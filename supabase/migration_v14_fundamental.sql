-- Migration v14: Grundchans (odds-fri vinstsannolikhet), se issue #93.
-- Nya rådata från ATG som modellen behöver + sparad Grundchans för utvärderingen.

alter table races add column if not exists first_prize integer;      -- förstapris i kr (klass)
alter table races add column if not exists breed text;               -- 'V' varmblod, 'K' kallblod

alter table starters add column if not exists start_distance integer;      -- distans inkl. tillägg
alter table starters add column if not exists start_points integer;        -- ATG:s startpoäng
alter table starters add column if not exists fundamental_p double precision;   -- Grundchans 0–1
alter table starters add column if not exists fundamental_version text;         -- modellversion

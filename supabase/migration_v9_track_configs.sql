-- Migration v9: Bankonfiguration (track_configs)
-- Kör i Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS track_configs (
  track_name             TEXT        PRIMARY KEY,
  open_stretch           BOOLEAN     NOT NULL DEFAULT false,
  open_stretch_lanes     INTEGER[]   NOT NULL DEFAULT '{}',
  short_race_threshold   INTEGER     NOT NULL DEFAULT 0,
  active                 BOOLEAN     NOT NULL DEFAULT true,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE track_configs ENABLE ROW LEVEL SECURITY;

-- Alla autentiserade kan läsa bankonfiguration
CREATE POLICY "Inloggade kan läsa track_configs"
  ON track_configs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Skrivning kräver service_role (admin-UI i fas 3 använder service client)
CREATE POLICY "Service kan skriva track_configs"
  ON track_configs FOR ALL
  USING (auth.role() = 'service_role');

-- Snabb uppslagning på track_name (PK — index skapas automatiskt)
-- Ingen extra index behövs; PRIMARY KEY implicerar unik B-tree index

-- Startvärden: 15 svenska travbanor
-- OBS: track_name MÅSTE matcha games.track (ATG API track.name fält)
-- Verifiera mot: SELECT DISTINCT track FROM games ORDER BY track
-- Dessa värden är best-guess och bör verifieras mot live games-data i fas 3 admin UI
INSERT INTO track_configs
  (track_name, open_stretch, open_stretch_lanes, short_race_threshold, active)
VALUES
  ('Solvalla',    true,  ARRAY[7,8,9,10,11,12], 1640, true),
  ('Åby',         false, '{}',                   1640, true),
  ('Jägersro',    true,  ARRAY[7,8,9,10,11,12],  1640, true),
  ('Romme',       false, '{}',                   1640, true),
  ('Bergsåker',   false, '{}',                   1640, true),
  ('Halmstad',    false, '{}',                   1640, true),
  ('Mantorp',     false, '{}',                   1640, true),
  ('Rättvik',     false, '{}',                   1640, true),
  ('Kalmar',      false, '{}',                   1640, true),
  ('Axevalla',    false, '{}',                   1640, true),
  ('Gävle',       false, '{}',                   1640, true),
  ('Örebro',      false, '{}',                   1640, true),
  ('Eskilstuna',  false, '{}',                   1640, true),
  ('Uppsala',     false, '{}',                   1640, true),
  ('Umåker',      false, '{}',                   1640, true)
ON CONFLICT (track_name) DO NOTHING;

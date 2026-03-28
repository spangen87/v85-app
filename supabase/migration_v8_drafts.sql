-- Migration v8: Draft support for game_systems
-- Kör i Supabase Dashboard → SQL Editor

ALTER TABLE game_systems
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

-- Index för snabb hämtning av utkast per användare och spel
CREATE INDEX IF NOT EXISTS idx_game_systems_draft
  ON game_systems(user_id, game_id, is_draft)
  WHERE is_draft = true;

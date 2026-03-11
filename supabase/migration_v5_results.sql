-- Migration v5: Race results tracking
-- Kör detta i Supabase Dashboard → SQL Editor

-- Lägg till slutplacering och tid på starters
ALTER TABLE starters ADD COLUMN IF NOT EXISTS finish_position integer;
ALTER TABLE starters ADD COLUMN IF NOT EXISTS finish_time text;

-- Index för snabb filtrering av utvärderade starters (har både formscore och resultat)
CREATE INDEX IF NOT EXISTS idx_starters_evaluated
  ON starters (race_id)
  WHERE formscore IS NOT NULL AND finish_position IS NOT NULL;

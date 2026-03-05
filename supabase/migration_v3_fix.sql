-- ============================================================
-- FIX v3: Kör detta i Supabase Dashboard → SQL Editor
-- (Tabellerna är redan skapade — detta fixar policies + personliga anteckningar)
-- ============================================================

-- Fix 1: groups INSERT-policy (auth.role() fungerar inte alltid för inserts)
DROP POLICY IF EXISTS "Inloggade kan skapa grupper" ON groups;
CREATE POLICY "Inloggade kan skapa grupper"
  ON groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 2: Tillåt personliga anteckningar (group_id nullable)
ALTER TABLE horse_notes ALTER COLUMN group_id DROP NOT NULL;

-- Fix 3: Uppdatera horse_notes SELECT-policy (inkludera personliga anteckningar)
DROP POLICY IF EXISTS "Gruppmedlemmar kan läsa anteckningar" ON horse_notes;
CREATE POLICY "Kan läsa anteckningar"
  ON horse_notes FOR SELECT USING (
    -- Personliga anteckningar: bara du ser dem
    (group_id IS NULL AND author_id = auth.uid())
    OR
    -- Grupps anteckningar: alla i gruppen ser dem
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = horse_notes.group_id
        AND group_members.user_id = auth.uid()
    ))
  );

-- Fix 4: Uppdatera horse_notes INSERT-policy (tillåt personliga anteckningar)
DROP POLICY IF EXISTS "Gruppmedlemmar kan skapa anteckningar" ON horse_notes;
CREATE POLICY "Kan skapa anteckningar"
  ON horse_notes FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND (
      group_id IS NULL  -- personlig anteckning
      OR EXISTS (
        SELECT 1 FROM group_members
        WHERE group_members.group_id = horse_notes.group_id
          AND group_members.user_id = auth.uid()
      )
    )
  );

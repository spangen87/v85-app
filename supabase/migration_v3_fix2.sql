-- ============================================================
-- FIX v3b: Lägg till FK så Supabase kan auto-joina horse_notes → profiles
-- Kör detta i Supabase Dashboard → SQL Editor
-- ============================================================

-- Säkerställ att profiler finns för alla befintliga användare innan vi lägger FK
INSERT INTO profiles (id, display_name)
SELECT id, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- Lägg till FK horse_notes.author_id → profiles.id
-- (PostgREST behöver denna för att kunna joina tabellerna automatiskt)
ALTER TABLE horse_notes
  ADD CONSTRAINT horse_notes_author_profile_fk
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

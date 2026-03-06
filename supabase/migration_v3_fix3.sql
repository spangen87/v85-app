-- ============================================================
-- FIX v3c: Åtgärda handle_new_user-triggern
-- Problem: "Database error saving new user" vid registrering
-- Orsak: SECURITY DEFINER-funktionen saknar SET search_path = public
--        och har ingen konflikthantering
-- Kör detta i Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (new.id, COALESCE(NULLIF(split_part(new.email, '@', 1), ''), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Återskapa triggern för säkerhets skull
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

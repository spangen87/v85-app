-- Migration v6: Spelspårning på gruppnivå
-- Medlemmar i en grupp kan logga och se varandras spel

CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  race_number INTEGER,
  horse_name TEXT,
  bet_type TEXT NOT NULL DEFAULT 'vinnare',
  stake INTEGER NOT NULL DEFAULT 0,   -- insats i kronor
  payout INTEGER,                      -- utdelning i kronor (null tills känt)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index för snabba uppslag
CREATE INDEX idx_bets_group_game ON bets(group_id, game_id);
CREATE INDEX idx_bets_user ON bets(user_id);

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Medlemmar i gruppen kan läsa varandras spel
CREATE POLICY "Group members can view bets" ON bets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = bets.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- Användare kan skapa sina egna spel
CREATE POLICY "Users can insert own bets" ON bets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Användare kan uppdatera sina egna spel
CREATE POLICY "Users can update own bets" ON bets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Användare kan ta bort sina egna spel
CREATE POLICY "Users can delete own bets" ON bets
  FOR DELETE
  USING (auth.uid() = user_id);

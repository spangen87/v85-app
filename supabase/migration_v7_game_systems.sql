CREATE TABLE game_systems (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id   UUID        REFERENCES groups(id) ON DELETE CASCADE,
  game_id    TEXT        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT 'Mitt system',
  selections JSONB       NOT NULL DEFAULT '[]',
  total_rows INTEGER     NOT NULL DEFAULT 1,
  score      INTEGER,
  is_graded  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT selections_is_array CHECK (jsonb_typeof(selections) = 'array')
);

CREATE INDEX idx_game_systems_group_game ON game_systems(group_id, game_id);
CREATE INDEX idx_game_systems_user       ON game_systems(user_id);

ALTER TABLE game_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and group systems"
  ON game_systems FOR SELECT
  USING (
    auth.uid() = user_id
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = game_systems.group_id
        AND group_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create own systems"
  ON game_systems FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own systems"
  ON game_systems FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own systems"
  ON game_systems FOR UPDATE
  USING (auth.uid() = user_id);

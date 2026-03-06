-- Migration v4: Sällskapssida
-- Lägger till ATG-lagslänk på groups och skapar forumtabell (group_posts)

-- 1. ATG-lagslänk på groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS atg_team_url text;

-- 2. Forumtabell
CREATE TABLE IF NOT EXISTS group_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_id    text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  parent_id  uuid REFERENCES group_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group_game
  ON group_posts(group_id, game_id, created_at);

-- 3. RLS
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read posts"
  ON group_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_posts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can insert posts"
  ON group_posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_posts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete own posts"
  ON group_posts FOR DELETE
  USING (author_id = auth.uid());

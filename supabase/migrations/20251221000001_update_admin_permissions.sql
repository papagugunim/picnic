-- Update RLS policies to allow admins and developers to manage all posts

-- ============================================
-- Posts Table (중고거래 게시물)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Create new policies with admin/developer access
CREATE POLICY "Users and admins can update posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Users and admins can delete posts"
  ON posts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'developer')
    )
  );

-- ============================================
-- Community Posts Table (동네생활 게시물)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update their own community posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own community posts" ON community_posts;

-- Create new policies with admin/developer access
CREATE POLICY "Users and admins can update community posts"
  ON community_posts FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Users and admins can delete community posts"
  ON community_posts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'developer')
    )
  );

-- ============================================
-- Community Comments Table (커뮤니티 댓글)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete their own community comments" ON community_comments;

-- Create new policies with admin/developer access for comments
CREATE POLICY "Users and admins can delete community comments"
  ON community_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'developer')
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Users and admins can update posts" ON posts IS 'Allows post authors and admins/developers to update posts';
COMMENT ON POLICY "Users and admins can delete posts" ON posts IS 'Allows post authors and admins/developers to delete posts';
COMMENT ON POLICY "Users and admins can update community posts" ON community_posts IS 'Allows post authors and admins/developers to update community posts';
COMMENT ON POLICY "Users and admins can delete community posts" ON community_posts IS 'Allows post authors and admins/developers to delete community posts';
COMMENT ON POLICY "Users and admins can delete community comments" ON community_comments IS 'Allows comment authors and admins/developers to delete comments';

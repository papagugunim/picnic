-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create post_interests table
CREATE TABLE IF NOT EXISTS post_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interests_user_id ON post_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_post_interests_post_id ON post_interests(post_id);

-- Enable RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_likes
-- Anyone can view like counts (but not who liked)
CREATE POLICY "Anyone can view post likes count"
  ON post_likes FOR SELECT
  USING (true);

-- Users can add their own likes
CREATE POLICY "Users can add their own likes"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can remove their own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for post_interests
-- Anyone can view interest counts (but not who showed interest)
CREATE POLICY "Anyone can view post interests count"
  ON post_interests FOR SELECT
  USING (true);

-- Users can add their own interests
CREATE POLICY "Users can add their own interests"
  ON post_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own interests
CREATE POLICY "Users can remove their own interests"
  ON post_interests FOR DELETE
  USING (auth.uid() = user_id);

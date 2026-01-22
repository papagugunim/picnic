-- Add view_count column to community_posts table
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;

-- Create index for view_count (useful for sorting by popularity)
CREATE INDEX IF NOT EXISTS idx_community_posts_view_count ON community_posts(view_count DESC);

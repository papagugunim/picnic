-- Add threaded comments support (X/Twitter style)

-- parent_id column for reply relationships
ALTER TABLE community_comments
ADD COLUMN parent_id UUID REFERENCES community_comments(id) ON DELETE CASCADE;

-- depth column for nesting level (max 2: comment -> reply -> reply to reply)
ALTER TABLE community_comments
ADD COLUMN depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 2);

-- reply_count for caching reply counts (performance optimization)
ALTER TABLE community_comments
ADD COLUMN reply_count INTEGER NOT NULL DEFAULT 0;

-- Index for efficient parent_id lookups (only for replies)
CREATE INDEX idx_community_comments_parent_id
ON community_comments(parent_id)
WHERE parent_id IS NOT NULL;

-- Index for root comments (for cursor-based pagination)
CREATE INDEX idx_community_comments_root
ON community_comments(post_id, created_at)
WHERE parent_id IS NULL;

-- Trigger function to automatically update reply_count
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE community_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE community_comments
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply_count updates
CREATE TRIGGER trigger_update_comment_reply_count
AFTER INSERT OR DELETE ON community_comments
FOR EACH ROW EXECUTE FUNCTION update_comment_reply_count();

-- Trigger function to automatically calculate depth
CREATE OR REPLACE FUNCTION calculate_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT depth + 1 INTO NEW.depth
    FROM community_comments
    WHERE id = NEW.parent_id;

    IF NEW.depth > 2 THEN
      RAISE EXCEPTION 'Maximum comment nesting depth exceeded (max: 2)';
    END IF;
  ELSE
    NEW.depth := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for depth calculation
CREATE TRIGGER trigger_calculate_comment_depth
BEFORE INSERT ON community_comments
FOR EACH ROW EXECUTE FUNCTION calculate_comment_depth();

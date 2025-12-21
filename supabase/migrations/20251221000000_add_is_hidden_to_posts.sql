-- Add is_hidden column to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- Add is_hidden column to community_posts table
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- Add index for is_hidden to improve query performance
CREATE INDEX IF NOT EXISTS idx_posts_is_hidden ON public.posts(is_hidden);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_hidden ON public.community_posts(is_hidden);

-- Add hidden_at and hidden_by columns to track who hid the post and when
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id);

ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES auth.users(id);

-- Comment on columns
COMMENT ON COLUMN public.posts.is_hidden IS 'Whether the post is hidden by admin/developer';
COMMENT ON COLUMN public.posts.hidden_at IS 'Timestamp when the post was hidden';
COMMENT ON COLUMN public.posts.hidden_by IS 'User ID of admin/developer who hid the post';

COMMENT ON COLUMN public.community_posts.is_hidden IS 'Whether the post is hidden by admin/developer';
COMMENT ON COLUMN public.community_posts.hidden_at IS 'Timestamp when the post was hidden';
COMMENT ON COLUMN public.community_posts.hidden_by IS 'User ID of admin/developer who hid the post';

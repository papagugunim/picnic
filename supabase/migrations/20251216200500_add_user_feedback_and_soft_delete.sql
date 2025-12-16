-- Add deleted_at column to profiles table for soft delete
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for deleted_at to improve query performance
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- Create user_feedback table for collecting user feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('account_deletion', 'bug_report', 'feature_request', 'general')),
  reason TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for user_feedback queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);

-- Enable RLS on user_feedback table
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_feedback
-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON public.user_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Comment on tables and columns
COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp when the user account was soft deleted';
COMMENT ON TABLE public.user_feedback IS 'Stores user feedback including account deletion reasons';
COMMENT ON COLUMN public.user_feedback.type IS 'Type of feedback: account_deletion, bug_report, feature_request, general';
COMMENT ON COLUMN public.user_feedback.reason IS 'Predefined reason code for the feedback';
COMMENT ON COLUMN public.user_feedback.feedback IS 'Additional user comments or details';

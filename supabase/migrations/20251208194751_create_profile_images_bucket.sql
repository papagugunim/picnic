-- Create profile-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, 'avatars/([^.]+)'))[1]
);

-- Policy: Anyone can view profile images (public bucket)
CREATE POLICY "Public profile images are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, 'avatars/([^.]+)'))[1]
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (regexp_match(name, 'avatars/([^.]+)'))[1]
);

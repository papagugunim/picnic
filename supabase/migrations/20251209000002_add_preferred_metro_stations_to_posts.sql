-- Add preferred_metro_stations column to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS preferred_metro_stations TEXT[] DEFAULT '{}';

-- Update existing rows to have empty arrays
UPDATE posts
SET preferred_metro_stations = '{}'
WHERE preferred_metro_stations IS NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

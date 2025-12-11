-- Update posts table schema to use preferred_metro_stations instead of neighborhood

-- Add preferred_metro_stations column
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS preferred_metro_stations TEXT[] DEFAULT '{}';

-- Make neighborhood nullable (optional)
ALTER TABLE posts
ALTER COLUMN neighborhood DROP NOT NULL;

-- Make trade_method nullable and set default
ALTER TABLE posts
ALTER COLUMN trade_method DROP NOT NULL,
ALTER COLUMN trade_method SET DEFAULT '{}';

-- Update existing rows to have empty arrays
UPDATE posts
SET preferred_metro_stations = '{}'
WHERE preferred_metro_stations IS NULL;

UPDATE posts
SET trade_method = '{}'
WHERE trade_method IS NULL;

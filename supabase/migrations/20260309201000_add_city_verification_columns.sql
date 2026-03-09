ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city_verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS city_verification_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city_verification_method TEXT,
  ADD COLUMN IF NOT EXISTS city_verification_distance_km NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS city_verification_accuracy_m NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS city_verification_last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS city_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS city_verification_attempts INTEGER DEFAULT 0;

UPDATE profiles
SET city_verification_status = COALESCE(city_verification_status, 'unverified'),
    city_verification_score = COALESCE(city_verification_score, 0),
    city_verification_attempts = COALESCE(city_verification_attempts, 0)
WHERE city_verification_status IS NULL
   OR city_verification_score IS NULL
   OR city_verification_attempts IS NULL;

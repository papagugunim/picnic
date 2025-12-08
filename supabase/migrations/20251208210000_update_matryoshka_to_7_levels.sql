-- Update existing levels FIRST before changing constraint
-- Level 8 (admin) -> Level 6 (admin)
-- Level 9 (developer) -> Level 7 (developer)
UPDATE profiles
SET matryoshka_level = 6
WHERE matryoshka_level = 8 AND user_role = 'admin';

UPDATE profiles
SET matryoshka_level = 7
WHERE matryoshka_level = 9 AND user_role = 'developer';

-- Now update the constraint to 1-7 instead of 1-9
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_matryoshka_level_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_matryoshka_level_check
CHECK (matryoshka_level >= 1 AND matryoshka_level <= 7);

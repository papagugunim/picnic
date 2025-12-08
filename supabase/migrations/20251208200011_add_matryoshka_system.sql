-- Add Matryoshka level system to profiles

-- Add matryoshka_level column (1-9)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS matryoshka_level INTEGER DEFAULT 1
CHECK (matryoshka_level >= 1 AND matryoshka_level <= 9);

-- Add user_role column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'user'
CHECK (user_role IN ('user', 'admin', 'developer'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_matryoshka_level ON profiles(matryoshka_level);
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);

-- Add comment for documentation
COMMENT ON COLUMN profiles.matryoshka_level IS 'Matryoshka trust level: 1-7 for users, 8 for admins, 9 for developers';
COMMENT ON COLUMN profiles.user_role IS 'User role: user, admin, or developer';

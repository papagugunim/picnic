-- Set yourself as Level 9 Developer
-- Replace YOUR_EMAIL with your actual email address

UPDATE profiles
SET 
  matryoshka_level = 9,
  user_role = 'developer',
  updated_at = NOW()
WHERE email = 'YOUR_EMAIL_HERE';

-- Verify the update
SELECT id, full_name, email, matryoshka_level, user_role
FROM profiles
WHERE user_role = 'developer';

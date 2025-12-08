-- Set thesmin@naver.com as Level 9 Developer
UPDATE profiles
SET 
  matryoshka_level = 9,
  user_role = 'developer',
  updated_at = NOW()
WHERE email = 'thesmin@naver.com';

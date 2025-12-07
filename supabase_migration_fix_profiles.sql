-- ============================================
-- Profiles 테이블 수정 및 자동 생성 트리거 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. city와 neighborhood를 NULL 허용으로 변경
ALTER TABLE profiles
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN neighborhood DROP NOT NULL;

-- 2. city와 neighborhood의 CHECK 제약조건 제거
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_city_check;

-- 3. 새로운 CHECK 제약조건 추가 (NULL 허용)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_city_check
  CHECK (city IS NULL OR city IN ('moscow', 'spb'));

-- 4. 신규 사용자 가입 시 자동으로 profiles 레코드 생성하는 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. auth.users에 트리거 추가
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. profiles에 INSERT 권한 추가 (트리거용)
CREATE POLICY "Allow insert on profiles for authenticated users"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

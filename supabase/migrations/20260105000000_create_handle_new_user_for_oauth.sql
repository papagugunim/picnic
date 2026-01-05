-- 새로운 사용자가 가입하면 자동으로 프로필을 생성하는 트리거 함수
-- OAuth (Google, Apple) 메타데이터를 지원합니다

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- profiles 테이블에 신규 사용자 레코드 생성
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    -- full_name: Google의 'name', Apple의 'full_name', 또는 이메일 앞부분 사용
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',  -- Apple
      NEW.raw_user_meta_data->>'name',       -- Google
      split_part(NEW.email, '@', 1)          -- Fallback: 이메일 앞부분
    ),
    -- avatar_url: Google의 'picture', Apple의 'avatar_url'
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url', -- Apple
      NEW.raw_user_meta_data->>'picture'     -- Google
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블에 INSERT 시 자동으로 handle_new_user() 함수 실행
-- 트리거가 이미 존재하면 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 함수에 대한 설명 추가
COMMENT ON FUNCTION public.handle_new_user() IS '새 사용자 가입 시 프로필 자동 생성 (OAuth 지원)';

-- ============================================
-- 마트료시카 레벨 → 브레드 레벨 이름 변경
-- ============================================

-- 1. 컬럼명 변경: matryoshka_level → bread_level
ALTER TABLE profiles
RENAME COLUMN matryoshka_level TO bread_level;

-- 2. 인덱스 재생성 (이름 변경)
DROP INDEX IF EXISTS idx_profiles_matryoshka_level;
CREATE INDEX idx_profiles_bread_level ON profiles(bread_level);

-- 3. 체크 제약조건 재생성 (이름 변경)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_matryoshka_level_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_bread_level_check
CHECK (bread_level >= 1 AND bread_level <= 7);

-- 4. 코멘트 업데이트
COMMENT ON COLUMN profiles.bread_level IS 'Bread trust level: 1-5 for users, 6 for admins, 7 for developers';

-- 5. 기존 함수 삭제 (반환 타입 변경을 위해)
DROP FUNCTION IF EXISTS search_user_by_name(TEXT);
DROP FUNCTION IF EXISTS set_user_role(UUID, TEXT);
DROP FUNCTION IF EXISTS list_admins();

-- 6. 사용자 등급 관리 함수 재생성
CREATE OR REPLACE FUNCTION search_user_by_name(search_name TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  user_role TEXT,
  bread_level INTEGER,
  city TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.user_role,
    p.bread_level,
    p.city,
    p.created_at
  FROM profiles p
  WHERE p.full_name ILIKE '%' || search_name || '%'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  new_level INTEGER;
  result JSON;
BEGIN
  -- 등급에 따른 bread_level 자동 설정 (1-7 범위)
  CASE new_role
    WHEN 'developer' THEN new_level := 7;
    WHEN 'admin' THEN new_level := 6;
    WHEN 'user' THEN new_level := 1;
    ELSE RAISE EXCEPTION 'Invalid role. Use: user, admin, or developer';
  END CASE;

  UPDATE profiles
  SET
    user_role = new_role,
    bread_level = new_level,
    updated_at = NOW()
  WHERE id = target_user_id;

  SELECT json_build_object(
    'success', true,
    'user_id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'new_role', p.user_role,
    'new_level', p.bread_level
  ) INTO result
  FROM profiles p
  WHERE p.id = target_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION list_admins()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  user_role TEXT,
  bread_level INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.user_role,
    p.bread_level,
    p.created_at
  FROM profiles p
  WHERE p.user_role IN ('admin', 'developer')
  ORDER BY
    CASE p.user_role WHEN 'developer' THEN 1 WHEN 'admin' THEN 2 END,
    p.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 설명 업데이트
COMMENT ON FUNCTION search_user_by_name IS '닉네임으로 사용자 검색. 예: SELECT * FROM search_user_by_name(''붉은광장'')';
COMMENT ON FUNCTION set_user_role IS '사용자 ID로 등급 변경. 예: SELECT set_user_role(''uuid-here'', ''admin'')';
COMMENT ON FUNCTION list_admins IS '모든 관리자/개발자 목록 조회. 예: SELECT * FROM list_admins()';

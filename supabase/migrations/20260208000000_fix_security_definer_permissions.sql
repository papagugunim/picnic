-- ============================================
-- SECURITY DEFINER 함수에 권한 검증 추가
-- 기존 함수를 대체하여 auth.uid() 기반 권한 체크 적용
-- ============================================

-- 1. 닉네임으로 사용자 검색 (admin/developer만 허용)
CREATE OR REPLACE FUNCTION search_user_by_name(search_name TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  user_role TEXT,
  matryoshka_level INTEGER,
  city TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 호출자 권한 확인
  SELECT p.user_role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'developer') THEN
    RAISE EXCEPTION 'Permission denied: admin or developer role required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.user_role,
    p.matryoshka_level,
    p.city,
    p.created_at
  FROM profiles p
  WHERE p.full_name ILIKE '%' || search_name || '%'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 사용자 등급 변경 (developer만 허용)
CREATE OR REPLACE FUNCTION set_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  caller_role TEXT;
  new_level INTEGER;
  result JSON;
BEGIN
  -- 호출자 권한 확인 (developer만 역할 변경 가능)
  SELECT p.user_role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  IF caller_role IS NULL OR caller_role != 'developer' THEN
    RAISE EXCEPTION 'Permission denied: developer role required';
  END IF;

  -- 자기 자신은 변경 불가
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change own role';
  END IF;

  -- 등급에 따른 matryoshka_level 자동 설정 (1-7 범위)
  CASE new_role
    WHEN 'developer' THEN new_level := 7;
    WHEN 'admin' THEN new_level := 6;
    WHEN 'user' THEN new_level := 1;
    ELSE RAISE EXCEPTION 'Invalid role. Use: user, admin, or developer';
  END CASE;

  -- 업데이트 실행
  UPDATE profiles
  SET
    user_role = new_role,
    matryoshka_level = new_level,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- 결과 반환
  SELECT json_build_object(
    'success', true,
    'user_id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'new_role', p.user_role,
    'new_level', p.matryoshka_level
  ) INTO result
  FROM profiles p
  WHERE p.id = target_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 닉네임으로 등급 변경 (developer만 허용, set_user_role 내부에서 재검증)
CREATE OR REPLACE FUNCTION set_user_role_by_name(
  target_name TEXT,
  new_role TEXT
)
RETURNS JSON AS $$
DECLARE
  caller_role TEXT;
  target_id UUID;
  user_count INTEGER;
BEGIN
  -- 호출자 권한 확인
  SELECT p.user_role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  IF caller_role IS NULL OR caller_role != 'developer' THEN
    RAISE EXCEPTION 'Permission denied: developer role required';
  END IF;

  -- 이름으로 사용자 찾기
  SELECT COUNT(*) INTO user_count
  FROM profiles
  WHERE full_name ILIKE '%' || target_name || '%';

  IF user_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'User not found: ' || target_name);
  ELSIF user_count > 1 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Multiple users found (' || user_count || '). Use search_user_by_name() first to find exact user ID.'
    );
  END IF;

  SELECT id INTO target_id
  FROM profiles
  WHERE full_name ILIKE '%' || target_name || '%'
  LIMIT 1;

  RETURN set_user_role(target_id, new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 모든 관리자/개발자 목록 조회 (admin/developer만 허용)
CREATE OR REPLACE FUNCTION list_admins()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  user_role TEXT,
  matryoshka_level INTEGER,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 호출자 권한 확인
  SELECT p.user_role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'developer') THEN
    RAISE EXCEPTION 'Permission denied: admin or developer role required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.user_role,
    p.matryoshka_level,
    p.created_at
  FROM profiles p
  WHERE p.user_role IN ('admin', 'developer')
  ORDER BY
    CASE p.user_role WHEN 'developer' THEN 1 WHEN 'admin' THEN 2 END,
    p.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 사용자 등급 초기화 (developer만 허용, set_user_role 내부에서 재검증)
CREATE OR REPLACE FUNCTION reset_user_role(target_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN set_user_role(target_user_id, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

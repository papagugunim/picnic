-- ============================================
-- 관리자 시스템: 계정 정지 및 신고 기능
-- ============================================

-- 1. profiles 테이블에 계정 정지 관련 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_expires_at TIMESTAMPTZ;

-- 정지된 계정 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended) WHERE is_suspended = true;

-- 2. 신고 테이블 생성
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'post', 'community_post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'inappropriate', 'fraud', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 신고 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);

-- 3. RLS 정책 설정
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 신고 가능
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- 사용자는 자신의 신고만 조회 가능
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- 관리자/개발자는 모든 신고 조회 가능
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'developer')
    )
  );

-- 관리자/개발자만 신고 수정 가능
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'developer')
    )
  );

-- 4. 계정 정지 함수
CREATE OR REPLACE FUNCTION suspend_user(
  target_user_id UUID,
  reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  admin_id UUID;
  result JSON;
BEGIN
  admin_id := auth.uid();

  -- 권한 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = admin_id
    AND user_role IN ('admin', 'developer')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- 자기 자신 정지 방지
  IF target_user_id = admin_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot suspend yourself');
  END IF;

  -- 개발자는 정지 불가
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = target_user_id
    AND user_role = 'developer'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Cannot suspend developers');
  END IF;

  -- 계정 정지
  UPDATE profiles
  SET
    is_suspended = true,
    suspended_at = NOW(),
    suspended_by = admin_id,
    suspension_reason = reason,
    suspension_expires_at = expires_at,
    updated_at = NOW()
  WHERE id = target_user_id;

  SELECT json_build_object(
    'success', true,
    'user_id', p.id,
    'full_name', p.full_name,
    'suspended_at', p.suspended_at,
    'expires_at', p.suspension_expires_at
  ) INTO result
  FROM profiles p
  WHERE p.id = target_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 계정 정지 해제 함수
CREATE OR REPLACE FUNCTION unsuspend_user(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  admin_id UUID;
  result JSON;
BEGIN
  admin_id := auth.uid();

  -- 권한 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = admin_id
    AND user_role IN ('admin', 'developer')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- 정지 해제
  UPDATE profiles
  SET
    is_suspended = false,
    suspended_at = NULL,
    suspended_by = NULL,
    suspension_reason = NULL,
    suspension_expires_at = NULL,
    updated_at = NOW()
  WHERE id = target_user_id;

  SELECT json_build_object(
    'success', true,
    'user_id', p.id,
    'full_name', p.full_name
  ) INTO result
  FROM profiles p
  WHERE p.id = target_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 관리자 대시보드 통계 함수
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- 권한 체크
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND user_role IN ('admin', 'developer')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'users_by_role', (
      SELECT json_object_agg(user_role, count)
      FROM (
        SELECT COALESCE(user_role, 'user') as user_role, COUNT(*) as count
        FROM profiles
        GROUP BY user_role
      ) r
    ),
    'users_by_city', (
      SELECT json_object_agg(city, count)
      FROM (
        SELECT city, COUNT(*) as count
        FROM profiles
        WHERE city IS NOT NULL
        GROUP BY city
      ) c
    ),
    'recent_signups_7d', (
      SELECT COUNT(*) FROM profiles
      WHERE created_at > NOW() - INTERVAL '7 days'
    ),
    'suspended_users', (
      SELECT COUNT(*) FROM profiles
      WHERE is_suspended = true
    ),
    'pending_reports', (
      SELECT COUNT(*) FROM reports
      WHERE status = 'pending'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 설명 추가
COMMENT ON FUNCTION suspend_user IS '사용자 계정 정지. 예: SELECT suspend_user(''uuid'', ''스팸'', ''2026-03-01'')';
COMMENT ON FUNCTION unsuspend_user IS '사용자 정지 해제. 예: SELECT unsuspend_user(''uuid'')';
COMMENT ON FUNCTION get_admin_stats IS '관리자 대시보드 통계 조회';

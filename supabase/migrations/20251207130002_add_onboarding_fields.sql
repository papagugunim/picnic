-- profiles 테이블에 온보딩 관련 필드 추가

-- 선호 지하철역 (최대 3개)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_metro_stations TEXT[] DEFAULT '{}';

-- 관심 카테고리
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT '{}';

-- 온보딩 완료 여부
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 온보딩 완료 시간
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

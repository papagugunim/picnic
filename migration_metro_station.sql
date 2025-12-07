-- profiles 테이블에 metro_station 컬럼 추가 및 neighborhood 컬럼 제거
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. metro_station 컬럼 추가 (기존 neighborhood 데이터가 있다면 복사)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS metro_station TEXT;

-- 2. 기존 neighborhood 데이터를 metro_station으로 복사 (선택사항)
UPDATE profiles
SET metro_station = neighborhood
WHERE metro_station IS NULL AND neighborhood IS NOT NULL;

-- 3. neighborhood 컬럼 제거 (선택사항 - 나중에 실행해도 됨)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS neighborhood;

-- posts 테이블도 업데이트 (게시물에 위치 정보가 있는 경우)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS metro_station TEXT;

UPDATE posts
SET metro_station = neighborhood
WHERE metro_station IS NULL AND neighborhood IS NOT NULL;

-- ALTER TABLE posts DROP COLUMN IF EXISTS neighborhood;

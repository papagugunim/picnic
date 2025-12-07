-- posts 테이블에 연락처 정보 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS contact_method TEXT DEFAULT 'chat' CHECK (contact_method IN ('chat', 'phone', 'telegram', 'kakao'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS contact_info TEXT; -- 전화번호, 텔레그램 ID 등

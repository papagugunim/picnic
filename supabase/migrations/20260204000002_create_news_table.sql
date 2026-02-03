-- 러시아 소식 테이블 생성
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT, -- 미리보기용 요약
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_news_created_at ON news(created_at DESC);
CREATE INDEX idx_news_is_published ON news(is_published) WHERE is_published = true;

-- RLS 활성화
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 발행된 소식 조회 가능
CREATE POLICY "Anyone can view published news"
  ON news FOR SELECT
  USING (is_published = true);

-- 관리자/개발자만 소식 생성 가능
CREATE POLICY "Admins can create news"
  ON news FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'developer')
    )
  );

-- 관리자/개발자만 소식 수정 가능
CREATE POLICY "Admins can update news"
  ON news FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'developer')
    )
  );

-- 관리자/개발자만 소식 삭제 가능
CREATE POLICY "Admins can delete news"
  ON news FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'developer')
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at();

-- 샘플 데이터 (선택적)
-- INSERT INTO news (title, content, summary, author_id) VALUES
-- ('모스크바 한인회, 설날 행사 개최 예정', '다가오는 설을 맞아 한인회에서 대규모 행사를 준비하고 있습니다. 행사는 2월 10일 모스크바 시내에서 진행될 예정이며, 한국 전통 음식과 문화 체험 프로그램이 마련됩니다.', '다가오는 설을 맞아 한인회에서 대규모 행사를 준비하고 있습니다...', (SELECT id FROM profiles WHERE user_role = 'developer' LIMIT 1)),
-- ('새로운 한인 마트 오픈', '상트페테르부르크에 한국 식품을 전문으로 하는 마트가 새롭게 오픈했습니다. 다양한 한국 식품과 생필품을 구매할 수 있습니다.', '상트페테르부르크에 한국 식품을 전문으로 하는 마트가 새롭게...', (SELECT id FROM profiles WHERE user_role = 'developer' LIMIT 1));

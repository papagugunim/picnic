-- posts 테이블: 구매자 정보 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES profiles(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_in_room_id UUID REFERENCES chat_rooms(id);

-- chat_rooms 테이블: 판매완료 정보 추가
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS sale_completed_at TIMESTAMPTZ;

-- reviews 테이블에 RLS 정책 활성화 (아직 안되어 있다면)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 거래 완료된 경우에만 리뷰 작성 가능
CREATE POLICY "Users can create reviews for completed sales"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
        AND posts.status = 'sold'
        AND (posts.author_id = reviewer_id OR posts.buyer_id = reviewer_id)
    )
  );

-- 모든 인증된 사용자가 리뷰 조회 가능
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

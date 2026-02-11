-- =============================================
-- 성능 최적화: 인덱스 추가 + 뷰 카운트 RPC 함수
-- =============================================

-- 커뮤니티 게시글 (날짜 기준 정렬)
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

-- 커뮤니티 좋아요 (게시글별 조회)
CREATE INDEX IF NOT EXISTS idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user_post ON community_likes(user_id, post_id);

-- 커뮤니티 댓글 (게시글별 조회)
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id, created_at);

-- 중고거래 게시글 (상태+날짜 복합)
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_city_status ON posts(city, status, created_at DESC);

-- 중고거래 좋아요/관심
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_interests_post_id ON post_interests(post_id);

-- 채팅 (테이블명: chat_messages, chat_rooms)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user1 ON chat_rooms(user1_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user2 ON chat_rooms(user2_id);

-- =============================================
-- 뷰 카운트 원자적 증가 RPC 함수 (race condition 방지)
-- =============================================

-- 커뮤니티 게시글 뷰 카운트 증가
CREATE OR REPLACE FUNCTION increment_community_view_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE community_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 중고거래 게시글 뷰 카운트 증가
CREATE OR REPLACE FUNCTION increment_post_view_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

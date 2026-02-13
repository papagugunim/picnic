-- ============================================
-- 댓글 트리거 함수에 SECURITY DEFINER 적용
-- update_comment_reply_count: 대댓글 작성 시 부모 댓글의 reply_count를 업데이트하는데,
-- RLS 정책(auth.uid() = user_id)으로 인해 다른 사용자의 댓글을 UPDATE할 수 없는 문제 수정
-- ============================================

-- 1. update_comment_reply_count를 SECURITY DEFINER로 재생성
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE community_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE community_comments
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. calculate_comment_depth도 SECURITY DEFINER로 재생성 (부모 댓글 SELECT 시 RLS 우회 필요)
CREATE OR REPLACE FUNCTION calculate_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT depth + 1 INTO NEW.depth
    FROM community_comments
    WHERE id = NEW.parent_id;

    IF NEW.depth > 2 THEN
      RAISE EXCEPTION 'Maximum comment nesting depth exceeded (max: 2)';
    END IF;
  ELSE
    NEW.depth := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

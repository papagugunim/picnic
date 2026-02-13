-- =========================================================
-- Fix: 댓글 작성 시 notifications.actor_id 컬럼 누락으로 인한 400 에러 해결
-- - notifications 스키마 보정 (actor_id / related_post_id / related_room_id)
-- - notify_community_comment 트리거 함수 안정화
--   (알림 생성 실패 시에도 댓글 작성은 성공하도록 예외 처리)
-- =========================================================

-- 1) notifications 컬럼 보정
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_id UUID;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_post_id UUID;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_room_id UUID;

-- 2) FK 제약 보정 (중복 생성 방지)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_actor_id_fkey'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_related_post_id_fkey'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_related_post_id_fkey
      FOREIGN KEY (related_post_id) REFERENCES posts(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_related_room_id_fkey'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_related_room_id_fkey
      FOREIGN KEY (related_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) 댓글 알림 트리거 함수 재정의 (예외 격리)
CREATE OR REPLACE FUNCTION notify_community_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_commenter_name TEXT;
  v_post RECORD;
BEGIN
  -- 댓글 작성자 이름
  SELECT full_name INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- 게시글 작성자 조회
  SELECT * INTO v_post
  FROM community_posts
  WHERE id = NEW.post_id;

  -- 게시글이 없으면 알림 생성 스킵
  IF v_post IS NULL THEN
    RETURN NEW;
  END IF;

  -- 본인 글에는 알림 생성 안 함
  IF v_post.user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- 알림 생성 실패가 댓글 작성을 막지 않도록 보호
  BEGIN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      actor_id
    ) VALUES (
      v_post.user_id,
      'community_comment',
      '새 댓글',
      COALESCE(v_commenter_name, '익명') || '님이 댓글을 남겼습니다: ' || LEFT(NEW.content, 30),
      '/community/' || NEW.post_id,
      NEW.user_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_community_comment failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) 트리거 재생성
DROP TRIGGER IF EXISTS trigger_notify_community_comment ON community_comments;

CREATE TRIGGER trigger_notify_community_comment
  AFTER INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_comment();


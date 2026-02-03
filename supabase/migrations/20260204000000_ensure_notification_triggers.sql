-- 알림 테이블 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 기존 트리거 재생성 (DROP IF EXISTS 후 CREATE)

-- 1. 새 메시지 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_new_message ON chat_messages;
DROP FUNCTION IF EXISTS notify_new_message();

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_room RECORD;
  v_sender_name TEXT;
  v_receiver_id UUID;
BEGIN
  -- 채팅방 정보 가져오기
  SELECT * INTO v_room
  FROM chat_rooms
  WHERE id = NEW.room_id;

  -- 채팅방이 없으면 알림 생성 건너뛰기
  IF v_room IS NULL THEN
    RETURN NEW;
  END IF;

  -- 발신자 이름 가져오기
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- 수신자 ID 결정
  IF v_room.user1_id = NEW.sender_id THEN
    v_receiver_id := v_room.user2_id;
  ELSE
    v_receiver_id := v_room.user1_id;
  END IF;

  -- 수신자가 없으면 알림 생성 건너뛰기
  IF v_receiver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 알림 생성 (에러가 나도 메시지 전송은 성공하도록)
  BEGIN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      actor_id,
      related_post_id,
      related_room_id
    ) VALUES (
      v_receiver_id,
      'new_message',
      '새 메시지',
      COALESCE(v_sender_name, '익명') || '님이 메시지를 보냈습니다',
      '/chats/' || NEW.room_id,
      NEW.sender_id,
      v_room.post_id,
      NEW.room_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- 알림 생성 실패해도 메시지 전송은 성공
    RAISE WARNING 'Failed to create notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- 2. 커뮤니티 댓글 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_community_comment ON community_comments;
DROP FUNCTION IF EXISTS notify_community_comment();

CREATE OR REPLACE FUNCTION notify_community_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_commenter_name TEXT;
  v_post RECORD;
BEGIN
  -- 댓글 작성자 이름 가져오기
  SELECT full_name INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- 게시물 정보 가져오기
  SELECT * INTO v_post
  FROM community_posts
  WHERE id = NEW.post_id;

  -- 자신의 게시물이 아닐 때만 알림
  IF v_post.user_id != NEW.user_id THEN
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_community_comment
  AFTER INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_comment();

-- 3. 게시물 좋아요 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_post_like ON post_likes;
DROP FUNCTION IF EXISTS notify_post_like();

CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
  v_liker_name TEXT;
  v_post RECORD;
BEGIN
  -- 좋아요한 사람 이름 가져오기
  SELECT full_name INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- 게시물 정보 가져오기
  SELECT * INTO v_post
  FROM posts
  WHERE id = NEW.post_id;

  -- 자신의 게시물이 아닐 때만 알림
  IF v_post.author_id != NEW.user_id THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      actor_id,
      related_post_id
    ) VALUES (
      v_post.author_id,
      'post_like',
      '좋아요',
      COALESCE(v_liker_name, '익명') || '님이 게시물을 좋아합니다',
      '/post/' || NEW.post_id,
      NEW.user_id,
      NEW.post_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_like();

-- 4. 커뮤니티 좋아요 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_community_like ON community_likes;
DROP FUNCTION IF EXISTS notify_community_like();

CREATE OR REPLACE FUNCTION notify_community_like()
RETURNS TRIGGER AS $$
DECLARE
  v_liker_name TEXT;
  v_post RECORD;
BEGIN
  -- 좋아요한 사람 이름 가져오기
  SELECT full_name INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- 게시물 정보 가져오기
  SELECT * INTO v_post
  FROM community_posts
  WHERE id = NEW.post_id;

  -- 자신의 게시물이 아닐 때만 알림
  IF v_post.user_id != NEW.user_id THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      actor_id
    ) VALUES (
      v_post.user_id,
      'community_like',
      '좋아요',
      COALESCE(v_liker_name, '익명') || '님이 게시물을 좋아합니다',
      '/community/' || NEW.post_id,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_community_like
  AFTER INSERT ON community_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_like();

-- 1. 새 메시지 알림 트리거
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

  -- 알림 생성
  PERFORM create_notification(
    v_receiver_id,
    'new_message',
    '새 메시지',
    COALESCE(v_sender_name, '익명') || '님이 메시지를 보냈습니다',
    '/chats/' || NEW.room_id,
    NEW.sender_id,
    v_room.post_id,
    NEW.room_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- 2. 약속 제안 알림 트리거
CREATE OR REPLACE FUNCTION notify_appointment_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_proposer_name TEXT;
BEGIN
  -- 제안자 이름 가져오기
  SELECT full_name INTO v_proposer_name
  FROM profiles
  WHERE id = NEW.proposer_id;

  -- 알림 생성 (응답자에게)
  PERFORM create_notification(
    NEW.responder_id,
    'appointment_proposal',
    '구매약속 제안',
    COALESCE(v_proposer_name, '익명') || '님이 구매약속을 제안했습니다',
    '/chats/' || NEW.room_id,
    NEW.proposer_id,
    NEW.post_id,
    NEW.room_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_appointment_proposal
  AFTER INSERT ON purchase_appointments
  FOR EACH ROW
  WHEN (NEW.status = 'proposed')
  EXECUTE FUNCTION notify_appointment_proposal();

-- 3. 약속 응답 알림 트리거 (승인/거부)
CREATE OR REPLACE FUNCTION notify_appointment_response()
RETURNS TRIGGER AS $$
DECLARE
  v_responder_name TEXT;
  v_notification_type TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- 응답이 변경된 경우에만
  IF OLD.status = 'proposed' AND (NEW.status = 'confirmed' OR NEW.status = 'cancelled') THEN
    -- 응답자 이름 가져오기
    SELECT full_name INTO v_responder_name
    FROM profiles
    WHERE id = NEW.responder_id;

    -- 알림 유형 결정
    IF NEW.status = 'confirmed' THEN
      v_notification_type := 'appointment_confirmed';
      v_notification_title := '약속 확정';
      v_notification_message := COALESCE(v_responder_name, '익명') || '님이 구매약속을 승인했습니다';
    ELSE
      v_notification_type := 'appointment_cancelled';
      v_notification_title := '약속 거부';
      v_notification_message := COALESCE(v_responder_name, '익명') || '님이 구매약속을 거부했습니다';
    END IF;

    -- 알림 생성 (제안자에게)
    PERFORM create_notification(
      NEW.proposer_id,
      v_notification_type,
      v_notification_title,
      v_notification_message,
      '/chats/' || NEW.room_id,
      NEW.responder_id,
      NEW.post_id,
      NEW.room_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_appointment_response
  AFTER UPDATE ON purchase_appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_response();

-- 4. 판매완료 알림 트리거
CREATE OR REPLACE FUNCTION notify_sale_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_name TEXT;
BEGIN
  -- 판매자 이름 가져오기
  SELECT full_name INTO v_seller_name
  FROM profiles
  WHERE id = NEW.author_id;

  -- 구매자에게 알림
  IF NEW.buyer_id IS NOT NULL THEN
    PERFORM create_notification(
      NEW.buyer_id,
      'sale_completed',
      '거래 완료',
      COALESCE(v_seller_name, '익명') || '님이 거래를 완료 처리했습니다',
      '/post/' || NEW.id,
      NEW.author_id,
      NEW.id,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_sale_completed
  AFTER UPDATE ON posts
  FOR EACH ROW
  WHEN (OLD.status != 'sold' AND NEW.status = 'sold')
  EXECUTE FUNCTION notify_sale_completed();

-- 5. 게시물 좋아요 알림 트리거
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
    PERFORM create_notification(
      v_post.author_id,
      'post_like',
      '좋아요',
      COALESCE(v_liker_name, '익명') || '님이 게시물을 좋아합니다',
      '/post/' || NEW.post_id,
      NEW.user_id,
      NEW.post_id,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_like();

-- 6. 게시물 관심 알림 트리거
CREATE OR REPLACE FUNCTION notify_post_interest()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_post RECORD;
BEGIN
  -- 관심 표시한 사람 이름 가져오기
  SELECT full_name INTO v_user_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- 게시물 정보 가져오기
  SELECT * INTO v_post
  FROM posts
  WHERE id = NEW.post_id;

  -- 자신의 게시물이 아닐 때만 알림
  IF v_post.author_id != NEW.user_id THEN
    PERFORM create_notification(
      v_post.author_id,
      'post_interest',
      '관심 등록',
      COALESCE(v_user_name, '익명') || '님이 게시물에 관심을 보였습니다',
      '/post/' || NEW.post_id,
      NEW.user_id,
      NEW.post_id,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_post_interest
  AFTER INSERT ON post_interests
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_interest();

-- 7. 댓글 알림 트리거
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
    PERFORM create_notification(
      v_post.user_id,
      'community_comment',
      '새 댓글',
      COALESCE(v_commenter_name, '익명') || '님이 댓글을 남겼습니다',
      '/community/' || NEW.post_id,
      NEW.user_id,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_community_comment
  AFTER INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_community_comment();

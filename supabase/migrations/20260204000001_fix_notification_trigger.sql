-- 트리거 함수 재생성 (null 체크 및 예외 처리 추가)
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

-- Fix: get_or_create_chat_room이 기존 방에 post_id를 업데이트하지 않던 버그 수정
-- 기존: 방이 이미 존재하면 post_id가 null이어도 그냥 반환
-- 수정: 방이 이미 존재하고 post_id가 null인데 p_post_id가 제공되면 업데이트

CREATE OR REPLACE FUNCTION get_or_create_chat_room(
  p_user1_id UUID,
  p_user2_id UUID,
  p_post_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_smaller_user_id UUID;
  v_larger_user_id UUID;
BEGIN
  -- Ensure user1_id < user2_id
  IF p_user1_id < p_user2_id THEN
    v_smaller_user_id := p_user1_id;
    v_larger_user_id := p_user2_id;
  ELSE
    v_smaller_user_id := p_user2_id;
    v_larger_user_id := p_user1_id;
  END IF;

  -- Try to find existing room
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE user1_id = v_smaller_user_id
    AND user2_id = v_larger_user_id;

  -- If room exists but has no post_id, update it
  IF v_room_id IS NOT NULL AND p_post_id IS NOT NULL THEN
    UPDATE chat_rooms
    SET post_id = p_post_id
    WHERE id = v_room_id
      AND post_id IS NULL;
  END IF;

  -- If room doesn't exist, create it
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (user1_id, user2_id, post_id)
    VALUES (v_smaller_user_id, v_larger_user_id, p_post_id)
    RETURNING id INTO v_room_id;
  END IF;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

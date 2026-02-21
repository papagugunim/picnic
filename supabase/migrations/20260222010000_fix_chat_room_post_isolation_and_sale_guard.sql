-- =====================================================
-- Chat room isolation by post + sale/appointment integrity guards
-- =====================================================

-- 1) Replace user-pair-only unique constraint with post-aware uniqueness
ALTER TABLE chat_rooms
  DROP CONSTRAINT IF EXISTS unique_chat_room;

-- one generic room (no post) per user pair
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_rooms_users_without_post
  ON chat_rooms (user1_id, user2_id)
  WHERE post_id IS NULL;

-- one trade room per (user pair, post)
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_rooms_users_with_post
  ON chat_rooms (user1_id, user2_id, post_id)
  WHERE post_id IS NOT NULL;

-- 2) get_or_create_chat_room: isolate rooms by post_id when provided
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
  -- normalize pair ordering (table check requires user1_id < user2_id)
  IF p_user1_id < p_user2_id THEN
    v_smaller_user_id := p_user1_id;
    v_larger_user_id := p_user2_id;
  ELSE
    v_smaller_user_id := p_user2_id;
    v_larger_user_id := p_user1_id;
  END IF;

  IF p_post_id IS NULL THEN
    SELECT id INTO v_room_id
    FROM chat_rooms
    WHERE user1_id = v_smaller_user_id
      AND user2_id = v_larger_user_id
      AND post_id IS NULL
    LIMIT 1;
  ELSE
    SELECT id INTO v_room_id
    FROM chat_rooms
    WHERE user1_id = v_smaller_user_id
      AND user2_id = v_larger_user_id
      AND post_id = p_post_id
    LIMIT 1;
  END IF;

  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;

  BEGIN
    INSERT INTO chat_rooms (user1_id, user2_id, post_id)
    VALUES (v_smaller_user_id, v_larger_user_id, p_post_id)
    RETURNING id INTO v_room_id;
  EXCEPTION
    WHEN unique_violation THEN
      IF p_post_id IS NULL THEN
        SELECT id INTO v_room_id
        FROM chat_rooms
        WHERE user1_id = v_smaller_user_id
          AND user2_id = v_larger_user_id
          AND post_id IS NULL
        LIMIT 1;
      ELSE
        SELECT id INTO v_room_id
        FROM chat_rooms
        WHERE user1_id = v_smaller_user_id
          AND user2_id = v_larger_user_id
          AND post_id = p_post_id
        LIMIT 1;
      END IF;
  END;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

-- 3) Appointment creation guard: room/post/user consistency
CREATE OR REPLACE FUNCTION create_purchase_appointment(
  p_room_id UUID,
  p_post_id UUID,
  p_appointment_date TIMESTAMPTZ,
  p_location TEXT,
  p_memo TEXT,
  p_proposer_id UUID,
  p_responder_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_appointment_id UUID;
  v_room chat_rooms%ROWTYPE;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_proposer_id <> v_caller_id THEN
    RAISE EXCEPTION 'Only proposer can create appointment';
  END IF;

  IF p_proposer_id = p_responder_id THEN
    RAISE EXCEPTION 'Proposer and responder must be different';
  END IF;

  SELECT * INTO v_room
  FROM chat_rooms
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chat room not found';
  END IF;

  IF p_proposer_id NOT IN (v_room.user1_id, v_room.user2_id)
     OR p_responder_id NOT IN (v_room.user1_id, v_room.user2_id) THEN
    RAISE EXCEPTION 'Appointment users must be room participants';
  END IF;

  IF v_room.post_id IS NULL OR v_room.post_id <> p_post_id THEN
    RAISE EXCEPTION 'Appointment post must match chat room post';
  END IF;

  -- cancel previous active appointment for same room+post
  UPDATE purchase_appointments
  SET status = 'cancelled', updated_at = NOW()
  WHERE room_id = p_room_id
    AND post_id = p_post_id
    AND status IN ('proposed', 'confirmed');

  INSERT INTO purchase_appointments (
    room_id, post_id, appointment_date, location, memo,
    proposer_id, responder_id, status
  ) VALUES (
    p_room_id, p_post_id, p_appointment_date, p_location, p_memo,
    p_proposer_id, p_responder_id, 'proposed'
  ) RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Sale completion guard: enforce room<->post consistency and confirmed appointment
CREATE OR REPLACE FUNCTION complete_sale(
  p_post_id UUID,
  p_room_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_room chat_rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_room
  FROM chat_rooms
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_room.post_id IS NULL OR v_room.post_id <> p_post_id THEN
    RETURN FALSE;
  END IF;

  IF p_seller_id = p_buyer_id THEN
    RETURN FALSE;
  END IF;

  IF p_seller_id NOT IN (v_room.user1_id, v_room.user2_id)
     OR p_buyer_id NOT IN (v_room.user1_id, v_room.user2_id) THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM purchase_appointments
    WHERE room_id = p_room_id
      AND post_id = p_post_id
      AND status = 'confirmed'
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE posts
  SET
    status = 'sold',
    buyer_id = p_buyer_id,
    sold_at = NOW(),
    sold_in_room_id = p_room_id
  WHERE id = p_post_id
    AND author_id = p_seller_id
    AND status IN ('active', 'reserved');

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE chat_rooms
  SET sale_completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_room_id;

  UPDATE purchase_appointments
  SET status = 'completed', updated_at = NOW()
  WHERE room_id = p_room_id
    AND post_id = p_post_id
    AND status = 'confirmed';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

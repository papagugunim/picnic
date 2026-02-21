-- Ensure only seller can execute complete_sale (SECURITY DEFINER hardening)

CREATE OR REPLACE FUNCTION complete_sale(
  p_post_id UUID,
  p_room_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_room chat_rooms%ROWTYPE;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL OR v_caller_id <> p_seller_id THEN
    RETURN FALSE;
  END IF;

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

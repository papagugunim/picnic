-- 약속 응답 함수 업데이트: 승인 시 제품 상태를 '예약중'으로 변경
CREATE OR REPLACE FUNCTION respond_to_appointment(
  p_appointment_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_post_id UUID;
  v_found BOOLEAN;
BEGIN
  -- 약속 정보 가져오기
  SELECT post_id INTO v_post_id
  FROM purchase_appointments
  WHERE id = p_appointment_id
    AND status = 'proposed';

  -- 약속 상태 업데이트
  UPDATE purchase_appointments
  SET
    status = p_status,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_appointment_id
    AND status = 'proposed';

  v_found := FOUND;

  -- 약속이 승인되면 제품을 예약중으로 변경
  IF v_found AND p_status = 'confirmed' AND v_post_id IS NOT NULL THEN
    UPDATE posts
    SET status = 'reserved'
    WHERE id = v_post_id
      AND status = 'active';
  END IF;

  -- 약속이 거부되면 제품을 다시 활성화 (다른 예약이 없는 경우에만)
  IF v_found AND p_status = 'cancelled' AND v_post_id IS NOT NULL THEN
    -- 해당 제품에 다른 확정된 약속이 없으면 active로 변경
    IF NOT EXISTS (
      SELECT 1 FROM purchase_appointments
      WHERE post_id = v_post_id
        AND status = 'confirmed'
        AND id != p_appointment_id
    ) THEN
      UPDATE posts
      SET status = 'active'
      WHERE id = v_post_id
        AND status = 'reserved';
    END IF;
  END IF;

  RETURN v_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 판매완료 함수도 업데이트: 예약중 상태에서도 판매 가능하도록
CREATE OR REPLACE FUNCTION complete_sale(
  p_post_id UUID,
  p_room_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 게시물 상태 업데이트 (active 또는 reserved 상태에서 sold로)
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

  -- 채팅방 판매완료 상태 업데이트
  UPDATE chat_rooms
  SET sale_completed_at = NOW()
  WHERE id = p_room_id;

  -- 활성 약속 완료 처리
  UPDATE purchase_appointments
  SET status = 'completed', updated_at = NOW()
  WHERE room_id = p_room_id
    AND status = 'confirmed';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

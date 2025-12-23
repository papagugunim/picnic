-- 구매약속 제안 생성 함수
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
BEGIN
  -- 기존 활성 약속 취소
  UPDATE purchase_appointments
  SET status = 'cancelled', updated_at = NOW()
  WHERE room_id = p_room_id
    AND status IN ('proposed', 'confirmed');

  -- 새 약속 생성
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

-- 약속 응답 (승인/거부) 함수
CREATE OR REPLACE FUNCTION respond_to_appointment(
  p_appointment_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE purchase_appointments
  SET
    status = p_status,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_appointment_id
    AND status = 'proposed';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 판매완료 처리 함수
CREATE OR REPLACE FUNCTION complete_sale(
  p_post_id UUID,
  p_room_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 게시물 상태 업데이트
  UPDATE posts
  SET
    status = 'sold',
    buyer_id = p_buyer_id,
    sold_at = NOW(),
    sold_in_room_id = p_room_id
  WHERE id = p_post_id
    AND author_id = p_seller_id
    AND status != 'sold';

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

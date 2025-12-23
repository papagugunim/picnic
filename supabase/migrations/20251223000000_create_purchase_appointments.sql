-- 구매약속 테이블 생성
CREATE TABLE IF NOT EXISTS purchase_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- 약속 정보
  appointment_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  memo TEXT,

  -- 상태: proposed(제안중), confirmed(확정), cancelled(취소), completed(완료)
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'cancelled', 'completed')),

  -- 참여자
  proposer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_appointments_room ON purchase_appointments(room_id);
CREATE INDEX IF NOT EXISTS idx_appointments_post ON purchase_appointments(post_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON purchase_appointments(status);

-- RLS 정책 활성화
ALTER TABLE purchase_appointments ENABLE ROW LEVEL SECURITY;

-- 채팅방 참여자만 약속 조회 가능
CREATE POLICY "Users can view appointments in their rooms"
  ON purchase_appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = room_id
      AND (chat_rooms.user1_id = auth.uid() OR chat_rooms.user2_id = auth.uid())
    )
  );

-- 채팅방 참여자만 약속 생성 가능
CREATE POLICY "Users can create appointments in their rooms"
  ON purchase_appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = proposer_id AND
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = room_id
      AND (chat_rooms.user1_id = auth.uid() OR chat_rooms.user2_id = auth.uid())
    )
  );

-- 채팅방 참여자만 약속 수정 가능
CREATE POLICY "Users can update appointments in their rooms"
  ON purchase_appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = room_id
      AND (chat_rooms.user1_id = auth.uid() OR chat_rooms.user2_id = auth.uid())
    )
  );

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON purchase_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

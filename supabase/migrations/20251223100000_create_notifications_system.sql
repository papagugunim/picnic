-- 알림 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_message',
    'appointment_proposal',
    'appointment_confirmed',
    'appointment_cancelled',
    'sale_completed',
    'review_request',
    'post_like',
    'post_interest',
    'community_comment',
    'community_like'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  related_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 알림만 업데이트 가능
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 알림 생성 함수 (시스템에서만 사용)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_related_post_id UUID DEFAULT NULL,
  p_related_room_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- 알림 삽입
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
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_actor_id,
    p_related_post_id,
    p_related_room_id
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 알림 일괄 읽음 처리 함수
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 읽지 않은 알림 개수 조회 함수
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM notifications
  WHERE user_id = p_user_id AND is_read = FALSE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

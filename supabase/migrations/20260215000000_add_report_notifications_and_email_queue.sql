-- =========================================================
-- 알림 확장:
-- 1) 신고 대상 작성자에게 알림 생성
-- 2) 새 알림 발생 시 이메일 발송 큐 적재
-- =========================================================

-- 0) 알림 타입 확장 (content_reported)
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'new_message',
      'appointment_proposal',
      'appointment_confirmed',
      'appointment_cancelled',
      'sale_completed',
      'review_request',
      'post_like',
      'post_interest',
      'community_comment',
      'community_like',
      'content_reported'
    )
  );

-- 1) 알림 이메일 큐 테이블
CREATE TABLE IF NOT EXISTS notification_email_queue (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_id UUID NOT NULL UNIQUE REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_email_queue_status_attempt
  ON notification_email_queue (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_notification_email_queue_created_at
  ON notification_email_queue (created_at DESC);

ALTER TABLE notification_email_queue ENABLE ROW LEVEL SECURITY;

-- 큐는 서버/백그라운드에서만 처리 (클라이언트 직접 접근 차단)
REVOKE ALL ON TABLE notification_email_queue FROM anon;
REVOKE ALL ON TABLE notification_email_queue FROM authenticated;

-- 2) notifications -> email queue 적재 트리거
CREATE OR REPLACE FUNCTION enqueue_notification_email()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM profiles
  WHERE id = NEW.user_id;

  -- 이메일이 없으면 큐 적재 스킵
  IF v_email IS NULL OR LENGTH(TRIM(v_email)) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO notification_email_queue (
    notification_id,
    user_id,
    user_email,
    subject,
    message,
    link
  ) VALUES (
    NEW.id,
    NEW.user_id,
    v_email,
    '[피크닉] ' || NEW.title,
    NEW.message,
    NEW.link
  )
  ON CONFLICT (notification_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enqueue_notification_email ON notifications;

CREATE TRIGGER trigger_enqueue_notification_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_notification_email();

-- 3) 신고 생성 시 대상 작성자에게 알림 생성
CREATE OR REPLACE FUNCTION notify_report_target_owner()
RETURNS TRIGGER AS $$
DECLARE
  v_target_owner_id UUID;
  v_link TEXT;
  v_reason_label TEXT;
BEGIN
  -- 대상 타입별 소유자/링크 결정
  IF NEW.target_type = 'post' THEN
    SELECT p.author_id INTO v_target_owner_id
    FROM posts p
    WHERE p.id = NEW.target_id;

    v_link := '/post/' || NEW.target_id;
  ELSIF NEW.target_type = 'community_post' THEN
    SELECT cp.user_id INTO v_target_owner_id
    FROM community_posts cp
    WHERE cp.id = NEW.target_id;

    v_link := '/community/' || NEW.target_id;
  ELSIF NEW.target_type = 'comment' THEN
    SELECT cc.user_id, '/community/' || cc.post_id
    INTO v_target_owner_id, v_link
    FROM community_comments cc
    WHERE cc.id = NEW.target_id;
  ELSE
    -- user 신고는 본 요청 범위에서 제외
    RETURN NEW;
  END IF;

  -- 대상이 없거나 자기 신고면 알림 생성 안 함
  IF v_target_owner_id IS NULL OR v_target_owner_id = NEW.reporter_id THEN
    RETURN NEW;
  END IF;

  v_reason_label := CASE NEW.reason
    WHEN 'spam' THEN '스팸/광고'
    WHEN 'abuse' THEN '욕설/비방'
    WHEN 'inappropriate' THEN '부적절한 내용'
    WHEN 'fraud' THEN '사기 의심'
    ELSE '기타'
  END;

  BEGIN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      actor_id
    ) VALUES (
      v_target_owner_id,
      'content_reported',
      '신고 접수',
      '내가 작성한 콘텐츠가 신고되었습니다. 사유: ' || v_reason_label || '. 운영팀이 확인 중입니다.',
      v_link,
      NEW.reporter_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- 신고 저장은 성공시키고 알림 실패는 격리
    RAISE WARNING 'notify_report_target_owner failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_report_target_owner ON reports;

CREATE TRIGGER trigger_notify_report_target_owner
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_target_owner();

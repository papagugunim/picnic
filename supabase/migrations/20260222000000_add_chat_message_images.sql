-- 채팅 메시지 이미지 첨부 지원
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_content_or_images'
  ) THEN
    ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_content_or_images
    CHECK (
      char_length(btrim(content)) > 0
      OR COALESCE(array_length(image_urls, 1), 0) > 0
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_max_images'
  ) THEN
    ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_max_images
    CHECK (COALESCE(array_length(image_urls, 1), 0) <= 5);
  END IF;
END
$$;

-- 마지막 메시지 트리거를 이미지 메시지에 맞게 보정
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
DECLARE
  v_trimmed_content TEXT := btrim(NEW.content);
  v_has_images BOOLEAN := COALESCE(array_length(NEW.image_urls, 1), 0) > 0;
BEGIN
  UPDATE chat_rooms
  SET
    last_message = CASE
      WHEN v_has_images AND char_length(v_trimmed_content) = 0 THEN '📷 사진'
      ELSE NEW.content
    END,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create chat rooms table (1:1 chat between two users)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- Optional: related marketplace post
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure user1_id < user2_id to avoid duplicate rooms
  CONSTRAINT check_user_order CHECK (user1_id < user2_id),
  -- Unique constraint to prevent duplicate chat rooms
  CONSTRAINT unique_chat_room UNIQUE (user1_id, user2_id)
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user1 ON chat_rooms(user1_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user2 ON chat_rooms(user2_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_post ON chat_rooms(post_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON chat_rooms(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
-- Users can see rooms they're part of
CREATE POLICY "Users can view their own chat rooms"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create chat rooms
CREATE POLICY "Users can create chat rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update their own chat rooms
CREATE POLICY "Users can update their own chat rooms"
  ON chat_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for chat_messages
-- Users can view messages in their rooms
CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = room_id
      AND (chat_rooms.user1_id = auth.uid() OR chat_rooms.user2_id = auth.uid())
    )
  );

-- Users can send messages to their rooms
CREATE POLICY "Users can send messages to their rooms"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = room_id
      AND (chat_rooms.user1_id = auth.uid() OR chat_rooms.user2_id = auth.uid())
    )
  );

-- Users can update their own messages (for read status)
CREATE POLICY "Users can update message read status"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = room_id
      AND (chat_rooms.user1_id = auth.uid() OR chat_rooms.user2_id = auth.uid())
    )
  );

-- Trigger to update chat_rooms.updated_at
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update chat room's last message
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last message when a new message is sent
CREATE TRIGGER update_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();

-- Function to get or create chat room
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

  -- If room doesn't exist, create it
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (user1_id, user2_id, post_id)
    VALUES (v_smaller_user_id, v_larger_user_id, p_post_id)
    RETURNING id INTO v_room_id;
  END IF;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

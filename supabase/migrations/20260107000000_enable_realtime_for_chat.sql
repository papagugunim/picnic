-- Enable Realtime for chat_messages table
-- This allows real-time subscriptions to INSERT, UPDATE, DELETE events

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;

-- Grant necessary permissions for realtime
GRANT SELECT ON chat_messages TO authenticated;
GRANT SELECT ON chat_rooms TO authenticated;

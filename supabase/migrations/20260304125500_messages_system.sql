-- ============================================================================
-- Daily Worker Hub - Messages System Enhancement
-- ============================================================================
-- This migration creates the conversations table and enhances the messages table
-- to support real-time chat between workers and businesses.
-- Version: 20260304125500
-- Date: 2026-03-04
-- ============================================================================

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_1_type TEXT NOT NULL CHECK (participant_1_type IN ('worker', 'business')),
  participant_2_type TEXT NOT NULL CHECK (participant_2_type IN ('worker', 'business')),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT DEFAULT '',
  unread_count_participant_1 INTEGER DEFAULT 0,
  unread_count_participant_2 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure participant_1 always has the smaller UUID to prevent duplicate conversations
  CONSTRAINT check_participant_order CHECK (participant_1_id < participant_2_id)
);

-- Create index for faster conversation lookup
CREATE INDEX idx_conversations_participants ON conversations(participant_1_id, participant_2_id);
CREATE INDEX idx_conversations_booking ON conversations(booking_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- ============================================================================
-- MESSAGES TABLE ENHANCEMENT
-- ============================================================================

-- Add new columns to messages table
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update conversation's last message info
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation when new message is added
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to update unread count
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
BEGIN
  -- Get conversation details
  SELECT * INTO conv FROM conversations WHERE id = NEW.conversation_id;
  
  -- Increment unread count for receiver
  IF NEW.receiver_id = conv.participant_1_id THEN
    UPDATE conversations
    SET unread_count_participant_1 = unread_count_participant_1 + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations
    SET unread_count_participant_2 = unread_count_participant_2 + 1
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment unread count
DROP TRIGGER IF EXISTS trigger_increment_unread_count ON messages;
CREATE TRIGGER trigger_increment_unread_count
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.is_read = FALSE)
  EXECUTE FUNCTION increment_unread_count();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversations updated_at
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conversations where they are a participant
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() = participant_1_id OR 
    auth.uid() = participant_2_id
  );

-- Policy: Users can create conversations where they are a participant
CREATE POLICY "Users can create their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = participant_1_id OR 
    auth.uid() = participant_2_id
  );

-- Policy: Users can update conversations where they are a participant
CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (
    auth.uid() = participant_1_id OR 
    auth.uid() = participant_2_id
  );

-- Enable RLS on messages table (if not already enabled)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages where they are sender or receiver
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Policy: Users can insert messages where they are the sender
CREATE POLICY "Users can send messages as themselves"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update messages where they are the receiver (for marking as read)
CREATE POLICY "Users can update messages they received"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Add messages table to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Add conversations table to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- After running this migration:
-- 1. The conversations table will be created
-- 2. The messages table will be enhanced with new columns
-- 3. Indexes will be created for better performance
-- 4. RLS policies will be enabled for security
-- 5. Realtime will be enabled for live updates
-- 6. Triggers will automatically update conversation metadata
-- ============================================================================

-- Comment on tables for documentation
COMMENT ON TABLE conversations IS 'Stores conversation threads between workers and businesses';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';

-- Column comments
COMMENT ON COLUMN conversations.participant_1_type IS 'Type of participant_1: worker or business';
COMMENT ON COLUMN conversations.participant_2_type IS 'Type of participant_2: worker or business';
COMMENT ON COLUMN conversations.last_message_preview IS 'Preview of the last message (first 100 chars)';
COMMENT ON COLUMN conversations.unread_count_participant_1 IS 'Unread message count for participant_1';
COMMENT ON COLUMN conversations.unread_count_participant_2 IS 'Unread message count for participant_2';

COMMENT ON COLUMN messages.conversation_id IS 'Reference to the conversation this message belongs to';
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, or file';
COMMENT ON COLUMN messages.media_url IS 'URL for image or file attachments';
COMMENT ON COLUMN messages.read_at IS 'Timestamp when the message was read by receiver';

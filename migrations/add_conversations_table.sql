-- ============================================================================
-- Conversations Table Migration
-- ============================================================================
-- This migration creates the conversations table to store shift-scoped
-- messaging threads between businesses and workers.
-- Each conversation is tied to a specific booking, enabling real-time chat
-- for shift coordination before, during, and after shifts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create conversations table
-- ----------------------------------------------------------------------------
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  unread_worker_count INTEGER NOT NULL DEFAULT 0,
  unread_business_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Add comments for documentation
-- ----------------------------------------------------------------------------
COMMENT ON TABLE conversations IS 'Stores shift-scoped messaging threads between businesses and workers tied to confirmed bookings';
COMMENT ON COLUMN conversations.id IS 'Unique identifier for the conversation';
COMMENT ON COLUMN conversations.booking_id IS 'Reference to the booking this conversation is scoped to. Each booking has at most one conversation.';
COMMENT ON COLUMN conversations.worker_id IS 'Reference to the worker participant in this conversation';
COMMENT ON COLUMN conversations.business_id IS 'Reference to the business participant in this conversation';
COMMENT ON COLUMN conversations.last_message_id IS 'Reference to the most recent message in this conversation';
COMMENT ON COLUMN conversations.last_message_at IS 'Timestamp of the most recent message for sorting conversations';
COMMENT ON COLUMN conversations.unread_worker_count IS 'Number of unread messages for the worker';
COMMENT ON COLUMN conversations.unread_business_count IS 'Number of unread messages for the business';
COMMENT ON COLUMN conversations.created_at IS 'Timestamp when the conversation was created';
COMMENT ON COLUMN conversations.updated_at IS 'Timestamp when the conversation was last updated';

-- ----------------------------------------------------------------------------
-- Create indexes for performance
-- ----------------------------------------------------------------------------
CREATE INDEX idx_conversations_booking_id ON conversations(booking_id);
CREATE INDEX idx_conversations_worker_id ON conversations(worker_id);
CREATE INDEX idx_conversations_business_id ON conversations(business_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_conversations_worker_unread ON conversations(worker_id) WHERE unread_worker_count > 0;
CREATE INDEX idx_conversations_business_unread ON conversations(business_id) WHERE unread_business_count > 0;

-- ----------------------------------------------------------------------------
-- Enable Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Create RLS policies
-- Workers and businesses can only see conversations where they are a
-- participant AND the booking status is accepted, in_progress, or completed.
-- ----------------------------------------------------------------------------

-- SELECT: participants can view their own conversations for active/completed bookings
CREATE POLICY "Participants can view their conversations" ON conversations
  FOR SELECT USING (
    (
      auth.uid()::text = worker_id::text
      OR auth.uid()::text = business_id::text
    )
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = conversations.booking_id
      AND bookings.status IN ('accepted', 'in_progress', 'completed')
    )
  );

-- INSERT: only participants (or service role) can create conversations
CREATE POLICY "Participants can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid()::text = worker_id::text
    OR auth.uid()::text = business_id::text
    OR auth.role() = 'service_role'
  );

-- UPDATE: participants can update conversation state (e.g., unread counts)
CREATE POLICY "Participants can update their conversations" ON conversations
  FOR UPDATE USING (
    auth.uid()::text = worker_id::text
    OR auth.uid()::text = business_id::text
  );

-- DELETE: participants can delete conversations (e.g., conversation cleanup)
CREATE POLICY "Participants can delete their conversations" ON conversations
  FOR DELETE USING (
    auth.uid()::text = worker_id::text
    OR auth.uid()::text = business_id::text
  );

-- Service role policy for background jobs and edge functions
CREATE POLICY "Service role can view all conversations" ON conversations
  FOR SELECT USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- Create update_updated_at_column function if it doesn't exist
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Create trigger for updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

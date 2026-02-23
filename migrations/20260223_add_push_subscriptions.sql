-- ============================================================================
-- Push Subscriptions Table Migration
-- ============================================================================
-- This migration creates the push_subscriptions table to store Web Push API
-- subscription data for browser push notifications.
-- Version: 20260223
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create push_subscriptions table
-- ----------------------------------------------------------------------------
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256h TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Add comments for documentation
-- ----------------------------------------------------------------------------
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscriptions for browser push notifications';
COMMENT ON COLUMN push_subscriptions.id IS 'Unique identifier for the push subscription';
COMMENT ON COLUMN push_subscriptions.user_id IS 'Reference to the user who owns this subscription';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'The push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.keys_p256h IS 'The P-256 ECDH public key for the push subscription';
COMMENT ON COLUMN push_subscriptions.keys_auth IS 'The authentication secret for the push subscription';
COMMENT ON COLUMN push_subscriptions.created_at IS 'Timestamp when the subscription was created';
COMMENT ON COLUMN push_subscriptions.updated_at IS 'Timestamp when the subscription was last updated';

-- ----------------------------------------------------------------------------
-- Create indexes for performance
-- ----------------------------------------------------------------------------
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_created_at ON push_subscriptions(created_at);

-- ----------------------------------------------------------------------------
-- Enable Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Create RLS policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Service role policy for edge functions to send push notifications
CREATE POLICY "Service role can view all push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- Create trigger for updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

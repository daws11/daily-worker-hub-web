-- ============================================================================
-- User Notification Preferences Table Migration
-- ============================================================================
-- This migration creates the user_notification_preferences table to store
-- user notification settings for browser push notifications.
-- Version: 20260223
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Create user_notification_preferences table
-- ----------------------------------------------------------------------------
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  new_applications BOOLEAN NOT NULL DEFAULT TRUE,
  booking_status BOOLEAN NOT NULL DEFAULT TRUE,
  payment_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  new_job_matches BOOLEAN NOT NULL DEFAULT TRUE,
  shift_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Add comments for documentation
-- ----------------------------------------------------------------------------
COMMENT ON TABLE user_notification_preferences IS 'Stores user notification preferences for browser push notifications';
COMMENT ON COLUMN user_notification_preferences.id IS 'Unique identifier for the notification preferences record';
COMMENT ON COLUMN user_notification_preferences.user_id IS 'Reference to the user who owns these preferences';
COMMENT ON COLUMN user_notification_preferences.push_enabled IS 'Master switch to enable/disable all push notifications';
COMMENT ON COLUMN user_notification_preferences.new_applications IS 'Notify businesses of new job applications from workers';
COMMENT ON COLUMN user_notification_preferences.booking_status IS 'Notify workers of booking status changes (accepted, rejected, etc.)';
COMMENT ON COLUMN user_notification_preferences.payment_confirmation IS 'Notify both parties of payment confirmations';
COMMENT ON COLUMN user_notification_preferences.new_job_matches IS 'Notify workers of new job matching their skills and location';
COMMENT ON COLUMN user_notification_preferences.shift_reminders IS 'Notify workers 2 hours before shift start time';
COMMENT ON COLUMN user_notification_preferences.created_at IS 'Timestamp when the preferences were created';
COMMENT ON COLUMN user_notification_preferences.updated_at IS 'Timestamp when the preferences were last updated';

-- ----------------------------------------------------------------------------
-- Create indexes for performance
-- ----------------------------------------------------------------------------
CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_preferences_push_enabled ON user_notification_preferences(push_enabled);
CREATE INDEX idx_user_notification_preferences_created_at ON user_notification_preferences(created_at);

-- ----------------------------------------------------------------------------
-- Enable Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Create RLS policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own notification preferences" ON user_notification_preferences
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own notification preferences" ON user_notification_preferences
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own notification preferences" ON user_notification_preferences
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own notification preferences" ON user_notification_preferences
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Service role policy for edge functions to check notification preferences
CREATE POLICY "Service role can view all notification preferences" ON user_notification_preferences
  FOR SELECT USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- Create trigger for updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

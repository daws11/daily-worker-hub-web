-- Migration: FCM Tokens and Notification Preferences
-- Description: Create tables for storing FCM device tokens and user notification preferences
-- Date: 2026-03-18

-- ============================================
-- USER FCM TOKENS TABLE
-- ============================================

-- Table to store FCM device tokens for each user
-- A user can have multiple tokens (multiple devices/browsers)
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type VARCHAR(10) NOT NULL CHECK (device_type IN ('web', 'android', 'ios')),
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique token per user
    CONSTRAINT unique_user_token UNIQUE (user_id, token)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_is_active ON user_fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_type ON user_fcm_tokens(device_type);

-- Comments for documentation
COMMENT ON TABLE user_fcm_tokens IS 'Stores FCM device tokens for push notifications';
COMMENT ON COLUMN user_fcm_tokens.user_id IS 'Reference to the user who owns this token';
COMMENT ON COLUMN user_fcm_tokens.token IS 'FCM device token for sending push notifications';
COMMENT ON COLUMN user_fcm_tokens.device_type IS 'Type of device: web (browser), android, or ios';
COMMENT ON COLUMN user_fcm_tokens.device_id IS 'Unique identifier for the device';
COMMENT ON COLUMN user_fcm_tokens.device_name IS 'Human-readable device name (e.g., "Chrome on macOS")';
COMMENT ON COLUMN user_fcm_tokens.is_active IS 'Whether this token is currently active and valid';
COMMENT ON COLUMN user_fcm_tokens.last_used_at IS 'Timestamp of last successful notification send';

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================

-- Table to store user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Master switch for push notifications
    push_enabled BOOLEAN DEFAULT true,
    
    -- Notification type preferences
    booking_notifications BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    message_notifications BOOLEAN DEFAULT true,
    reminder_notifications BOOLEAN DEFAULT true,
    review_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    
    -- Quiet hours settings
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start VARCHAR(5) DEFAULT '22:00', -- HH:mm format
    quiet_hours_end VARCHAR(5) DEFAULT '07:00', -- HH:mm format
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- One preference row per user
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Index for efficient user lookup
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Comments for documentation
COMMENT ON TABLE notification_preferences IS 'User notification preferences for push notifications';
COMMENT ON COLUMN notification_preferences.push_enabled IS 'Master switch to enable/disable all push notifications';
COMMENT ON COLUMN notification_preferences.booking_notifications IS 'Notifications for booking events (created, confirmed, cancelled)';
COMMENT ON COLUMN notification_preferences.payment_notifications IS 'Notifications for payment events';
COMMENT ON COLUMN notification_preferences.message_notifications IS 'Notifications for new messages';
COMMENT ON COLUMN notification_preferences.reminder_notifications IS 'Notifications for job/shift reminders';
COMMENT ON COLUMN notification_preferences.review_notifications IS 'Notifications for review requests';
COMMENT ON COLUMN notification_preferences.marketing_notifications IS 'Marketing and promotional notifications';
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'Whether quiet hours are enabled';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Start time for quiet hours (HH:mm format)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'End time for quiet hours (HH:mm format)';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on both tables
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_fcm_tokens

-- Users can view their own tokens
CREATE POLICY "Users can view own FCM tokens"
    ON user_fcm_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert own FCM tokens"
    ON user_fcm_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own FCM tokens"
    ON user_fcm_tokens FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own FCM tokens"
    ON user_fcm_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can manage all tokens (for backend operations)
CREATE POLICY "Service role can manage all FCM tokens"
    ON user_fcm_tokens FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for notification_preferences

-- Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can manage all preferences (for backend operations)
CREATE POLICY "Service role can manage all notification preferences"
    ON notification_preferences FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on user_fcm_tokens
CREATE TRIGGER update_user_fcm_tokens_updated_at
    BEFORE UPDATE ON user_fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to get all active tokens for a user
CREATE OR REPLACE FUNCTION get_user_fcm_tokens(p_user_id UUID)
RETURNS TABLE(token TEXT, device_type VARCHAR(10), device_name VARCHAR(255))
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.token, t.device_type, t.device_name
    FROM user_fcm_tokens t
    WHERE t.user_id = p_user_id
    AND t.is_active = true
    ORDER BY t.last_used_at DESC NULLS LAST;
END;
$$;

-- Function to mark a token as inactive
CREATE OR REPLACE FUNCTION deactivate_fcm_token(p_token TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_fcm_tokens
    SET is_active = false, updated_at = now()
    WHERE token = p_token;
END;
$$;

-- Function to clean up old inactive tokens (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_fcm_tokens()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_fcm_tokens
    WHERE is_active = false
    AND updated_at < now() - interval '30 days';
END;
$$;

-- ============================================
-- INITIAL DATA / DEFAULTS
-- ============================================

-- Note: Default notification preferences are created automatically
-- when a user registers their first FCM token (via the API route)

-- ============================================
-- GRANTS
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_fcm_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

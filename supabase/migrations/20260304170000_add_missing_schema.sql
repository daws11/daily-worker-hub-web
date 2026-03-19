-- Migration: Add missing tables and columns
-- Date: 2026-03-04
-- Purpose: Complete the badges, wallet, and messages system setup

-- ====================================================================
-- 1. CREATE CONVERSATIONS TABLE (Missing)
-- ====================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_1_type TEXT NOT NULL DEFAULT 'worker',
    participant_2_type TEXT NOT NULL DEFAULT 'business',
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count_participant_1 INTEGER DEFAULT 0,
    unread_count_participant_2 INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant_1_id, participant_2_id)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- ====================================================================
-- 2. ADD CONVERSATION_ID TO MESSAGES TABLE
-- ====================================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create index for conversation_id
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC);

-- ====================================================================
-- 3. ENABLE REALTIME FOR MESSAGES
-- ====================================================================

-- Add messages to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END $$;

-- Add conversations to realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;
END $$;

-- ====================================================================
-- 4. RLS POLICIES FOR CONVERSATIONS
-- ====================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- Users can update their conversations
CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant_1_id OR auth.uid() = participant_2_id
    );

-- Service role full access
CREATE POLICY "Service role full access on conversations" ON conversations
    FOR ALL USING (auth.role() = 'service_role');

-- ====================================================================
-- 5. TRIGGER TO UPDATE CONVERSATION ON NEW MESSAGE
-- ====================================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or create conversation
    INSERT INTO conversations (participant_1_id, participant_2_id, last_message_at, last_message_preview)
    VALUES (
        LEAST(NEW.sender_id, NEW.receiver_id),
        GREATEST(NEW.sender_id, NEW.receiver_id),
        NEW.created_at,
        LEFT(NEW.content, 100)
    )
    ON CONFLICT (participant_1_id, participant_2_id)
    DO UPDATE SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = NOW();
    
    -- Link message to conversation
    NEW.conversation_id := (
        SELECT id FROM conversations
        WHERE participant_1_id = LEAST(NEW.sender_id, NEW.receiver_id)
        AND participant_2_id = GREATEST(NEW.sender_id, NEW.receiver_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_message_update_conversation'
    ) THEN
        CREATE TRIGGER on_message_update_conversation
            BEFORE INSERT ON messages
            FOR EACH ROW
            EXECUTE FUNCTION update_conversation_on_message();
    END IF;
END $$;

-- ====================================================================
-- 6. SEED SOME BADGES IF NOT EXISTS
-- ====================================================================

-- Only insert if badges table is empty
INSERT INTO badges (name, slug, description, icon, category, is_certified)
SELECT 
    name,
    slug,
    description,
    icon,
    category::badge_category,
    is_certified
FROM (
    VALUES
    ('First Job', 'first-job', 'Completed your first job', '🎉', 'achievement', false),
    ('10 Jobs', '10-jobs', 'Completed 10 jobs', '⭐', 'achievement', false),
    ('50 Jobs', '50-jobs', 'Completed 50 jobs', '🌟', 'achievement', false),
    ('100 Jobs', '100-jobs', 'Completed 100 jobs', '💫', 'achievement', false),
    ('Top Rated', 'top-rated', 'Maintained 4.5+ rating', '⭐', 'achievement', false),
    ('Punctual', 'punctual', 'Always on time', '⏰', 'achievement', false),
    ('Reliable', 'reliable', '100% job completion rate', '✓', 'achievement', false)
) AS v(name, slug, description, icon, category, is_certified)
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE slug = v.slug);

-- ====================================================================
-- DONE!
-- ====================================================================

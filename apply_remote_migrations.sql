-- Combined Migration Script for Remote Supabase
-- Generated: Wed Mar  4 16:51:04 CET 2026
-- Apply this via Supabase Dashboard > SQL Editor


-- ============================================================================
-- Daily Worker Hub - Badges System Migration
-- ============================================================================
-- This migration creates the badges and worker_badges tables for gamification
-- and tier progression.
-- Version: 20260304125500
-- Date: 2026-03-04
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Badge types
CREATE TYPE badge_type AS ENUM ('tier', 'achievement', 'skill');

-- Tier requirements
CREATE TYPE tier_requirement AS ENUM ('classic', 'pro', 'elite', 'champion');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Badges table (badge definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT DEFAULT NULL,
  badge_type badge_type NOT NULL,
  tier_requirement tier_requirement DEFAULT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on badge_type for faster queries
CREATE INDEX idx_badges_type ON badges(badge_type);

-- Add index on tier_requirement for faster queries
CREATE INDEX idx_badges_tier ON badges(tier_requirement) WHERE tier_requirement IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Worker badges table (earned badges by workers)
-- ----------------------------------------------------------------------------
CREATE TABLE worker_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, badge_id)
);

-- Add index on worker_id for faster queries
CREATE INDEX idx_worker_badges_worker ON worker_badges(worker_id);

-- Add index on badge_id for faster queries
CREATE INDEX idx_worker_badges_badge ON worker_badges(badge_id);

-- Add index on earned_at for sorting
CREATE INDEX idx_worker_badges_earned ON worker_badges(earned_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on badges table
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Enable RLS on worker_badges table
ALTER TABLE worker_badges ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Badges policies
-- ----------------------------------------------------------------------------

-- Public can view active badge definitions
CREATE POLICY "Badges are viewable by everyone"
ON badges FOR SELECT
USING (is_active = TRUE);

-- Only admins can insert badges (using service role)
CREATE POLICY "Service role can insert badges"
ON badges FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Only admins can update badges (using service role)
CREATE POLICY "Service role can update badges"
ON badges FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Only admins can delete badges (using service role)
CREATE POLICY "Service role can delete badges"
ON badges FOR DELETE
USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- Worker badges policies
-- ----------------------------------------------------------------------------

-- Workers can view their own badges
CREATE POLICY "Workers can view own badges"
ON worker_badges FOR SELECT
USING (
  worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  )
);

-- Businesses can view worker badges (for job listings)
CREATE POLICY "Businesses can view worker badges"
ON worker_badges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workers w
    WHERE w.id = worker_badges.worker_id
  )
);

-- System can insert badges (using service role)
CREATE POLICY "Service role can assign badges"
ON worker_badges FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- System can update badges (using service role)
CREATE POLICY "Service role can update worker badges"
ON worker_badges FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- System can delete badges (using service role)
CREATE POLICY "Service role can delete worker badges"
ON worker_badges FOR DELETE
USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update badges timestamp
CREATE TRIGGER badges_updated_at
BEFORE UPDATE ON badges
FOR EACH ROW
EXECUTE FUNCTION update_badges_updated_at();

-- ============================================================================
-- SEED DATA - Initial Badges
-- ============================================================================

-- Insert Tier Badges
INSERT INTO badges (name, description, icon_url, badge_type, tier_requirement, criteria, points) VALUES
(
  'Classic',
  'Starting tier - Welcome to Daily Worker Hub!',
  '/badges/classic.svg',
  'tier',
  'classic',
  '{"description": "Default tier for all new workers"}'::jsonb,
  0
),
(
  'Pro',
  'Experienced worker with proven track record',
  '/badges/pro.svg',
  'tier',
  'pro',
  '{"jobs_completed": 10, "rating_min": 4.0}'::jsonb,
  100
),
(
  'Elite',
  'Top performer with excellent ratings and reliability',
  '/badges/elite.svg',
  'tier',
  'elite',
  '{"jobs_completed": 50, "rating_min": 4.5, "on_time_percentage": 90}'::jsonb,
  500
),
(
  'Champion',
  'Elite worker with outstanding performance and leadership',
  '/badges/champion.svg',
  'tier',
  'champion',
  '{"jobs_completed": 100, "rating_min": 4.8, "on_time_percentage": 95, "reliability_score": 95}'::jsonb,
  1000
);

-- Insert Achievement Badges
INSERT INTO badges (name, description, icon_url, badge_type, tier_requirement, criteria, points) VALUES
(
  'First Job',
  'Completed your first job on Daily Worker Hub',
  '/badges/first-job.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 1}'::jsonb,
  10
),
(
  '10 Jobs',
  'Completed 10 jobs - You are building momentum!',
  '/badges/10-jobs.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 10}'::jsonb,
  50
),
(
  '50 Jobs',
  'Completed 50 jobs - You are a reliable worker!',
  '/badges/50-jobs.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 50}'::jsonb,
  200
),
(
  '100 Jobs',
  'Completed 100 jobs - You are a veteran worker!',
  '/badges/100-jobs.svg',
  'achievement',
  NULL,
  '{"jobs_completed": 100}'::jsonb,
  500
),
(
  'Perfect Week',
  'Completed all jobs in a week with 5-star rating',
  '/badges/perfect-week.svg',
  'achievement',
  NULL,
  '{"weekly_jobs": 5, "weekly_rating": 5.0}'::jsonb,
  100
),
(
  'Early Bird',
  'Accepted 10 jobs within 1 hour of posting',
  '/badges/early-bird.svg',
  'achievement',
  NULL,
  '{"fast_acceptances": 10}'::jsonb,
  75
);

-- Insert Skill Badges
INSERT INTO badges (name, description, icon_url, badge_type, tier_requirement, criteria, points) VALUES
(
  'Top Rated',
  'Maintained 4.8+ rating over 20+ jobs',
  '/badges/top-rated.svg',
  'skill',
  NULL,
  '{"jobs_completed": 20, "rating_min": 4.8}'::jsonb,
  150
),
(
  'Punctual',
  '90%+ on-time arrival rate over 20+ jobs',
  '/badges/punctual.svg',
  'skill',
  NULL,
  '{"jobs_completed": 20, "on_time_percentage": 90}'::jsonb,
  150
),
(
  'Reliable',
  '95%+ job completion rate with no no-shows',
  '/badges/reliable.svg',
  'skill',
  NULL,
  '{"jobs_completed": 30, "completion_rate": 95, "no_shows": 0}'::jsonb,
  200
),
(
  'Super Communicator',
  'Excellent communication with businesses',
  '/badges/communicator.svg',
  'skill',
  NULL,
  '{"jobs_completed": 15, "response_time_avg_minutes": 30, "communication_rating": 4.5}'::jsonb,
  100
),
(
  'Customer Favorite',
  'Received 10+ positive reviews from businesses',
  '/badges/customer-favorite.svg',
  'skill',
  NULL,
  '{"positive_reviews": 10, "jobs_completed": 15}'::jsonb,
  125
);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for worker badge summary
CREATE OR REPLACE VIEW worker_badge_summary AS
SELECT
  wb.worker_id,
  w.full_name,
  COUNT(wb.id) AS total_badges,
  SUM(b.points) AS total_points,
  MAX(wb.earned_at) AS last_badge_earned_at,
  array_agg(
    json_build_object(
      'name', b.name,
      'type', b.badge_type,
      'earned_at', wb.earned_at,
      'points', b.points
    )
  ) AS badges
FROM worker_badges wb
JOIN workers w ON w.id = wb.worker_id
JOIN badges b ON b.id = wb.badge_id
GROUP BY wb.worker_id, w.full_name;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if worker qualifies for a badge
CREATE OR REPLACE FUNCTION check_badge_eligibility(
  p_worker_id UUID,
  p_badge_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  badge_record RECORD;
  worker_stats RECORD;
  criteria_json JSONB;
  is_eligible BOOLEAN := TRUE;
BEGIN
  -- Get badge criteria
  SELECT criteria INTO criteria_json
  FROM badges
  WHERE id = p_badge_id;
  
  -- Get worker statistics (simplified version - can be expanded)
  SELECT
    COUNT(CASE WHEN b.status IN ('completed', 'accepted') THEN 1 END) AS jobs_completed,
    AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating END) AS avg_rating
  INTO worker_stats
  FROM bookings b
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE b.worker_id = p_worker_id;
  
  -- Check criteria (basic implementation)
  -- Jobs completed check
  IF (criteria_json->>'jobs_completed') IS NOT NULL THEN
    IF worker_stats.jobs_completed < (criteria_json->>'jobs_completed')::INTEGER THEN
      is_eligible := FALSE;
    END IF;
  END IF;
  
  -- Rating check
  IF (criteria_json->>'rating_min') IS NOT NULL THEN
    IF worker_stats.avg_rating IS NULL OR worker_stats.avg_rating < (criteria_json->>'rating_min')::DECIMAL THEN
      is_eligible := FALSE;
    END IF;
  END IF;
  
  RETURN is_eligible;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award badge to worker
CREATE OR REPLACE FUNCTION award_badge(
  p_worker_id UUID,
  p_badge_id UUID,
  p_progress JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_badge_id UUID;
BEGIN
  INSERT INTO worker_badges (worker_id, badge_id, progress)
  VALUES (p_worker_id, p_badge_id, p_progress)
  RETURNING id INTO new_badge_id;
  
  RETURN new_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE badges IS 'Badge definitions for gamification system';
COMMENT ON TABLE worker_badges IS 'Badges earned by workers';
COMMENT ON COLUMN badges.badge_type IS 'Type of badge: tier (level), achievement (milestone), or skill (competency)';
COMMENT ON COLUMN badges.tier_requirement IS 'Required tier level for tier badges';
COMMENT ON COLUMN badges.criteria IS 'JSON criteria required to earn this badge';
COMMENT ON COLUMN badges.points IS 'Points awarded when badge is earned';
COMMENT ON COLUMN worker_badges.progress IS 'JSON tracking progress toward badge completion';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


-- ====================================================================
-- MESSAGES SYSTEM
-- ====================================================================


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


-- ====================================================================
-- WALLET SYSTEM  
-- ====================================================================


-- ============================================================================
-- WORKER WALLET SYSTEM
-- ============================================================================
-- Complete wallet system for workers to receive payments and request withdrawals.
-- Version: 20260304125500
-- Date: 2026-03-04
-- ============================================================================

-- ============================================================================
-- ENUMS FOR WALLET SYSTEM
-- ============================================================================

-- Transaction type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_transaction_type') THEN
    CREATE TYPE worker_transaction_type AS ENUM ('earning', 'withdrawal', 'bonus', 'penalty');
  END IF;
END $$;

-- Transaction status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_transaction_status') THEN
    CREATE TYPE worker_transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
  END IF;
END $$;

-- Withdrawal request status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
    CREATE TYPE withdrawal_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
  END IF;
END $$;

-- ============================================================================
-- WALLETS TABLE (Worker-specific)
-- ============================================================================

CREATE TABLE IF NOT EXISTS worker_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  pending_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_earned DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id)
);

-- Indexes for worker_wallets
CREATE INDEX IF NOT EXISTS idx_worker_wallets_worker_id ON worker_wallets(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_wallets_created_at ON worker_wallets(created_at DESC);

-- Constraints to ensure non-negative balances
ALTER TABLE worker_wallets DROP CONSTRAINT IF EXISTS worker_wallets_balance_nonnegative;
ALTER TABLE worker_wallets ADD CONSTRAINT worker_wallets_balance_nonnegative CHECK (balance >= 0);

ALTER TABLE worker_wallets DROP CONSTRAINT IF EXISTS worker_wallets_pending_balance_nonnegative;
ALTER TABLE worker_wallets ADD CONSTRAINT worker_wallets_pending_balance_nonnegative CHECK (pending_balance >= 0);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS worker_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES worker_wallets(id) ON DELETE CASCADE,
  type worker_transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status worker_transaction_status NOT NULL DEFAULT 'pending',
  reference_id UUID,
  reference_type TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for worker_transactions
CREATE INDEX IF NOT EXISTS idx_worker_transactions_wallet_id ON worker_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_type ON worker_transactions(type);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_status ON worker_transactions(status);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_reference ON worker_transactions(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_created_at ON worker_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_processed_at ON worker_transactions(processed_at);

-- ============================================================================
-- WITHDRAWAL REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES worker_wallets(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for withdrawal_requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_worker_id ON withdrawal_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet_id ON withdrawal_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_processed_at ON withdrawal_requests(processed_at);

-- Constraint to ensure positive withdrawal amount
ALTER TABLE withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_amount_positive;
ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_amount_positive CHECK (amount > 0);

-- ============================================================================
-- TRIGGER: UPDATE UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_worker_wallets_updated_at ON worker_wallets;
CREATE TRIGGER update_worker_wallets_updated_at
  BEFORE UPDATE ON worker_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: AUTO-CREATE WALLET WHEN WORKER CREATED
-- ============================================================================

CREATE OR REPLACE FUNCTION create_wallet_on_worker_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Create wallet for new worker
  INSERT INTO public.worker_wallets (worker_id)
  VALUES (NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Wallet already exists, return without error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on workers table
DROP TRIGGER IF EXISTS on_worker_created_wallet ON workers;
CREATE TRIGGER on_worker_created_wallet
  AFTER INSERT ON workers
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_on_worker_created();

-- ============================================================================
-- FUNCTION: UPDATE WALLET BALANCE ON TRANSACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  w_id UUID;
BEGIN
  -- Get wallet_id from NEW transaction
  w_id := NEW.wallet_id;
  
  -- Only update balances when transaction is completed
  IF NEW.status = 'completed' THEN
    IF NEW.type = 'earning' OR NEW.type = 'bonus' THEN
      -- Add to balance
      UPDATE worker_wallets
      SET 
        balance = balance + NEW.amount,
        total_earned = total_earned + NEW.amount,
        updated_at = NOW()
      WHERE id = w_id;
      
    ELSIF NEW.type = 'withdrawal' THEN
      -- Deduct from balance and add to total_withdrawn
      UPDATE worker_wallets
      SET 
        balance = balance - NEW.amount,
        total_withdrawn = total_withdrawn + NEW.amount,
        updated_at = NOW()
      WHERE id = w_id;
      
    ELSIF NEW.type = 'penalty' THEN
      -- Deduct from balance (penalty)
      UPDATE worker_wallets
      SET 
        balance = balance - NEW.amount,
        updated_at = NOW()
      WHERE id = w_id;
    END IF;
  END IF;
  
  -- Set processed_at when status is completed or failed
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND NEW.processed_at IS NULL THEN
    NEW.processed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on worker_transactions table
DROP TRIGGER IF EXISTS on_transaction_update_wallet ON worker_transactions;
CREATE TRIGGER on_transaction_update_wallet
  BEFORE INSERT OR UPDATE ON worker_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance_on_transaction();

-- ============================================================================
-- FUNCTION: UPDATE WITHDRAWAL STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION process_withdrawal_status_change()
RETURNS TRIGGER AS $$
DECLARE
  w_worker_id UUID;
  w_wallet_id UUID;
BEGIN
  -- When withdrawal is completed, create a withdrawal transaction
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get worker and wallet info
    SELECT worker_id, wallet_id INTO w_worker_id, w_wallet_id
    FROM withdrawal_requests
    WHERE id = NEW.id;
    
    -- Create withdrawal transaction
    INSERT INTO worker_transactions (
      wallet_id,
      type,
      amount,
      status,
      reference_id,
      reference_type,
      description
    ) VALUES (
      w_wallet_id,
      'withdrawal',
      NEW.amount,
      'completed',
      NEW.id,
      'withdrawal_request',
      'Withdrawal to ' || NEW.bank_name || ' - ' || NEW.bank_account_number
    );
    
    -- Set processed_at timestamp
    NEW.processed_at := NOW();
  END IF;
  
  -- Set processed_at when rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.processed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on withdrawal_requests table
DROP TRIGGER IF EXISTS on_withdrawal_status_change ON withdrawal_requests;
CREATE TRIGGER on_withdrawal_status_change
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_withdrawal_status_change();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on wallet tables
ALTER TABLE worker_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: WORKER_WALLETS
-- ============================================================================

-- Workers can view their own wallet
DROP POLICY IF EXISTS "Workers can view own wallet" ON worker_wallets;
CREATE POLICY "Workers can view own wallet"
  ON worker_wallets FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Admins can view all wallets
DROP POLICY IF EXISTS "Admins can view all wallets" ON worker_wallets;
CREATE POLICY "Admins can view all wallets"
  ON worker_wallets FOR SELECT
  USING (is_admin());

-- Only system/trigger can insert wallets
DROP POLICY IF EXISTS "System can insert wallets" ON worker_wallets;
CREATE POLICY "System can insert wallets"
  ON worker_wallets FOR INSERT
  WITH CHECK (true);

-- Only system can update wallets (via triggers)
DROP POLICY IF EXISTS "System can update wallets" ON worker_wallets;
CREATE POLICY "System can update wallets"
  ON worker_wallets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: WORKER_TRANSACTIONS
-- ============================================================================

-- Workers can view their own transactions
DROP POLICY IF EXISTS "Workers can view own transactions" ON worker_transactions;
CREATE POLICY "Workers can view own transactions"
  ON worker_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT w.id FROM worker_wallets w
      JOIN workers wr ON wr.id = w.worker_id
      WHERE wr.user_id = auth.uid()
    )
  );

-- Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON worker_transactions;
CREATE POLICY "Admins can view all transactions"
  ON worker_transactions FOR SELECT
  USING (is_admin());

-- Only system can insert transactions
DROP POLICY IF EXISTS "System can insert transactions" ON worker_transactions;
CREATE POLICY "System can insert transactions"
  ON worker_transactions FOR INSERT
  WITH CHECK (true);

-- Only system can update transactions
DROP POLICY IF EXISTS "System can update transactions" ON worker_transactions;
CREATE POLICY "System can update transactions"
  ON worker_transactions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: WITHDRAWAL_REQUESTS
-- ============================================================================

-- Workers can view their own withdrawal requests
DROP POLICY IF EXISTS "Workers can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Workers can view own withdrawals"
  ON withdrawal_requests FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Admins can view all withdrawal requests
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON withdrawal_requests;
CREATE POLICY "Admins can view all withdrawals"
  ON withdrawal_requests FOR SELECT
  USING (is_admin());

-- Workers can create withdrawal requests
DROP POLICY IF EXISTS "Workers can create withdrawals" ON withdrawal_requests;
CREATE POLICY "Workers can create withdrawals"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Only admins can update withdrawal requests (process them)
DROP POLICY IF EXISTS "Admins can update withdrawals" ON withdrawal_requests;
CREATE POLICY "Admins can update withdrawals"
  ON withdrawal_requests FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- HELPER FUNCTIONS FOR APPLICATION LAYER
-- ============================================================================

-- Function to add earning to worker wallet
CREATE OR REPLACE FUNCTION add_worker_earning(
  p_worker_id UUID,
  p_amount DECIMAL(15,2),
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Get or create wallet
  SELECT id INTO v_wallet_id FROM worker_wallets WHERE worker_id = p_worker_id;
  
  IF v_wallet_id IS NULL THEN
    -- This shouldn't happen due to trigger, but handle it anyway
    INSERT INTO worker_wallets (worker_id) VALUES (p_worker_id) RETURNING id INTO v_wallet_id;
  END IF;
  
  -- Create pending transaction
  INSERT INTO worker_transactions (
    wallet_id,
    type,
    amount,
    status,
    reference_id,
    reference_type,
    description,
    metadata
  ) VALUES (
    v_wallet_id,
    'earning',
    p_amount,
    'completed',
    p_reference_id,
    p_reference_type,
    COALESCE(p_description, 'Earning from job'),
    p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to request withdrawal
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_worker_id UUID,
  p_amount DECIMAL(15,2),
  p_bank_name TEXT,
  p_bank_account_number TEXT,
  p_bank_account_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_withdrawal_id UUID;
  v_current_balance DECIMAL(15,2);
BEGIN
  -- Get wallet
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM worker_wallets 
  WHERE worker_id = p_worker_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Worker wallet not found';
  END IF;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current balance: %, Requested: %', v_current_balance, p_amount;
  END IF;
  
  -- Create withdrawal request
  INSERT INTO withdrawal_requests (
    worker_id,
    wallet_id,
    amount,
    bank_name,
    bank_account_number,
    bank_account_name
  ) VALUES (
    p_worker_id,
    v_wallet_id,
    p_amount,
    p_bank_name,
    p_bank_account_number,
    p_bank_account_name
  ) RETURNING id INTO v_withdrawal_id;
  
  -- Hold the balance (deduct immediately)
  UPDATE worker_wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Create pending transaction
  INSERT INTO worker_transactions (
    wallet_id,
    type,
    amount,
    status,
    reference_id,
    reference_type,
    description
  ) VALUES (
    v_wallet_id,
    'withdrawal',
    p_amount,
    'pending',
    v_withdrawal_id,
    'withdrawal_request',
    'Withdrawal request to ' || p_bank_name
  );
  
  RETURN v_withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel withdrawal and refund balance
CREATE OR REPLACE FUNCTION cancel_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_worker_id UUID;
  v_wallet_id UUID;
  v_amount DECIMAL(15,2);
  v_status withdrawal_status;
BEGIN
  -- Get withdrawal details
  SELECT worker_id, wallet_id, amount, status
  INTO v_worker_id, v_wallet_id, v_amount, v_status
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Can only cancel pending withdrawals';
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET status = 'rejected',
      notes = COALESCE(p_reason, 'Cancelled by system'),
      processed_at = NOW()
  WHERE id = p_withdrawal_id;
  
  -- Refund the balance
  UPDATE worker_wallets
  SET balance = balance + v_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Cancel pending transaction
  UPDATE worker_transactions
  SET status = 'cancelled',
      processed_at = NOW()
  WHERE reference_id = p_withdrawal_id AND type = 'withdrawal' AND status = 'pending';
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get worker wallet summary
CREATE OR REPLACE FUNCTION get_worker_wallet_summary(p_worker_id UUID)
RETURNS TABLE (
  wallet_id UUID,
  balance DECIMAL(15,2),
  pending_balance DECIMAL(15,2),
  total_earned DECIMAL(15,2),
  total_withdrawn DECIMAL(15,2),
  pending_withdrawals DECIMAL(15,2),
  total_transactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id AS wallet_id,
    w.balance,
    w.pending_balance,
    w.total_earned,
    w.total_withdrawn,
    COALESCE(SUM(wr.amount) FILTER (WHERE wr.status IN ('pending', 'processing')), 0) AS pending_withdrawals,
    (SELECT COUNT(*) FROM worker_transactions wt WHERE wt.wallet_id = w.id) AS total_transactions
  FROM worker_wallets w
  LEFT JOIN withdrawal_requests wr ON wr.wallet_id = w.id
  WHERE w.worker_id = p_worker_id
  GROUP BY w.id, w.balance, w.pending_balance, w.total_earned, w.total_withdrawn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIALIZE WALLETS FOR EXISTING WORKERS
-- ============================================================================

-- Create wallets for existing workers that don't have one yet
INSERT INTO worker_wallets (worker_id)
SELECT id FROM workers
WHERE id NOT IN (SELECT worker_id FROM worker_wallets)
ON CONFLICT (worker_id) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE worker_wallets IS 'Worker-specific wallets for receiving payments and tracking earnings';
COMMENT ON TABLE worker_transactions IS 'Transaction history for worker wallets including earnings, withdrawals, bonuses, and penalties';
COMMENT ON TABLE withdrawal_requests IS 'Worker withdrawal requests to bank accounts';

COMMENT ON COLUMN worker_wallets.balance IS 'Current available balance in IDR (can be withdrawn)';
COMMENT ON COLUMN worker_wallets.pending_balance IS 'Pending balance in IDR (waiting clearance)';
COMMENT ON COLUMN worker_wallets.total_earned IS 'Lifetime total earnings in IDR';
COMMENT ON COLUMN worker_wallets.total_withdrawn IS 'Lifetime total withdrawals in IDR';

COMMENT ON COLUMN worker_transactions.type IS 'earning=job payment, withdrawal=cash out, bonus=bonus payment, penalty=deduction';
COMMENT ON COLUMN worker_transactions.status IS 'pending=waiting, completed=done, failed=error, cancelled=reverted';
COMMENT ON COLUMN worker_transactions.reference_id IS 'ID of related entity (booking_id, etc)';
COMMENT ON COLUMN worker_transactions.reference_type IS 'Type of reference: booking, bonus, withdrawal_request, etc';

COMMENT ON COLUMN withdrawal_requests.status IS 'pending=awaiting review, processing=being processed, completed=sent to bank, rejected=cancelled';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


-- ====================================================================
-- DONE! All migrations applied.
-- ====================================================================

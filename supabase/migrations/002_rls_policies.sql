-- ============================================================================
-- Daily Worker Hub - RLS Policies Migration
-- ============================================================================
-- This migration adds comprehensive Row Level Security policies for enhanced
-- security and access control.
-- Version: 002
-- Date: 2026-02-22
-- ============================================================================

-- ============================================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    JOIN users ON auth.users.id::text = users.id::text
    WHERE auth.users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the current user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM users WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a business
CREATE OR REPLACE FUNCTION is_business_owner(business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = business_id
    AND businesses.user_id::text = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a worker profile
CREATE OR REPLACE FUNCTION is_worker_owner(worker_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workers
    WHERE workers.id = worker_id
    AND workers.user_id::text = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DROP EXISTING POLICIES (for replacement)
-- ============================================================================

-- Drop existing policies to replace with enhanced versions
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

DROP POLICY IF EXISTS "Businesses are viewable by everyone" ON businesses;
DROP POLICY IF EXISTS "Businesses can be updated by owner" ON businesses;

DROP POLICY IF EXISTS "Workers are viewable by everyone" ON workers;
DROP POLICY IF EXISTS "Workers can be updated by owner" ON workers;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Skills are viewable by everyone" ON skills;

DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON jobs;
DROP POLICY IF EXISTS "Jobs can be created by businesses" ON jobs;
DROP POLICY IF EXISTS "Jobs can be updated by business owner" ON jobs;

DROP POLICY IF EXISTS "Bookings are viewable by participants" ON bookings;
DROP POLICY IF EXISTS "Bookings can be created by workers" ON bookings;
DROP POLICY IF EXISTS "Bookings can be updated by business owner" ON bookings;

DROP POLICY IF EXISTS "Messages are viewable by sender or receiver" ON messages;
DROP POLICY IF EXISTS "Messages can be created by authenticated users" ON messages;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Reviews can be created by business owner" ON reviews;

DROP POLICY IF EXISTS "Notifications are viewable by owner" ON notifications;
DROP POLICY IF EXISTS "Notifications can be updated by owner" ON notifications;

DROP POLICY IF EXISTS "Reports are viewable by reporter" ON reports;
DROP POLICY IF EXISTS "Reports can be created by authenticated users" ON reports;

-- ============================================================================
-- ENHANCED RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users Table Policies
-- ----------------------------------------------------------------------------

-- Public read access (for profile viewing)
CREATE POLICY "Users: Public read access" ON users
  FOR SELECT
  USING (true);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users: Insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "Users: Update own profile" ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Admins can update any user
CREATE POLICY "Users: Admin update access" ON users
  FOR UPDATE
  USING (is_admin());

-- Users can delete their own account
CREATE POLICY "Users: Delete own account" ON users
  FOR DELETE
  USING (auth.uid()::text = id::text);

-- Admins can delete any user
CREATE POLICY "Users: Admin delete access" ON users
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Businesses Table Policies
-- ----------------------------------------------------------------------------

-- Public read access
CREATE POLICY "Businesses: Public read access" ON businesses
  FOR SELECT
  USING (true);

-- Business owners can insert their business
CREATE POLICY "Businesses: Insert own business" ON businesses
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Business owners can update their business
CREATE POLICY "Businesses: Update own business" ON businesses
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Admins can update any business
CREATE POLICY "Businesses: Admin update access" ON businesses
  FOR UPDATE
  USING (is_admin());

-- Business owners can delete their business
CREATE POLICY "Businesses: Delete own business" ON businesses
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Admins can delete any business
CREATE POLICY "Businesses: Admin delete access" ON businesses
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Workers Table Policies
-- ----------------------------------------------------------------------------

-- Public read access
CREATE POLICY "Workers: Public read access" ON workers
  FOR SELECT
  USING (true);

-- Workers can insert their own profile
CREATE POLICY "Workers: Insert own profile" ON workers
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Workers can update their own profile
CREATE POLICY "Workers: Update own profile" ON workers
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Admins can update any worker
CREATE POLICY "Workers: Admin update access" ON workers
  FOR UPDATE
  USING (is_admin());

-- Workers can delete their own profile
CREATE POLICY "Workers: Delete own profile" ON workers
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Admins can delete any worker
CREATE POLICY "Workers: Admin delete access" ON workers
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Categories Table Policies
-- ----------------------------------------------------------------------------

-- Public read access
CREATE POLICY "Categories: Public read access" ON categories
  FOR SELECT
  USING (true);

-- Admins can insert categories
CREATE POLICY "Categories: Admin insert access" ON categories
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update categories
CREATE POLICY "Categories: Admin update access" ON categories
  FOR UPDATE
  USING (is_admin());

-- Admins can delete categories
CREATE POLICY "Categories: Admin delete access" ON categories
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Skills Table Policies
-- ----------------------------------------------------------------------------

-- Public read access
CREATE POLICY "Skills: Public read access" ON skills
  FOR SELECT
  USING (true);

-- Admins can insert skills
CREATE POLICY "Skills: Admin insert access" ON skills
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update skills
CREATE POLICY "Skills: Admin update access" ON skills
  FOR UPDATE
  USING (is_admin());

-- Admins can delete skills
CREATE POLICY "Skills: Admin delete access" ON skills
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Jobs Table Policies
-- ----------------------------------------------------------------------------

-- Public read access for active jobs
CREATE POLICY "Jobs: Public read access" ON jobs
  FOR SELECT
  USING (true);

-- Business owners can create jobs
CREATE POLICY "Jobs: Create by business owner" ON jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Business owners can update their jobs
CREATE POLICY "Jobs: Update by business owner" ON jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can update any job
CREATE POLICY "Jobs: Admin update access" ON jobs
  FOR UPDATE
  USING (is_admin());

-- Business owners can delete their jobs
CREATE POLICY "Jobs: Delete by business owner" ON jobs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can delete any job
CREATE POLICY "Jobs: Admin delete access" ON jobs
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Jobs Skills Junction Table Policies
-- ----------------------------------------------------------------------------

-- Public read access
CREATE POLICY "Jobs Skills: Public read access" ON jobs_skills
  FOR SELECT
  USING (true);

-- Business owners can link skills to their jobs
CREATE POLICY "Jobs Skills: Create by business owner" ON jobs_skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      JOIN businesses ON businesses.id = jobs.business_id
      WHERE jobs.id = job_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Business owners can unlink skills from their jobs
CREATE POLICY "Jobs Skills: Delete by business owner" ON jobs_skills
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      JOIN businesses ON businesses.id = jobs.business_id
      WHERE jobs.id = job_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can manage job skills
CREATE POLICY "Jobs Skills: Admin full access" ON jobs_skills
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- Bookings Table Policies
-- ----------------------------------------------------------------------------

-- Read access for participants (worker and business)
CREATE POLICY "Bookings: Read by participants" ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
    OR is_admin()
  );

-- Workers can create bookings
CREATE POLICY "Bookings: Create by worker" ON bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Workers can update their bookings
CREATE POLICY "Bookings: Update by worker" ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
  );

-- Business owners can update bookings
CREATE POLICY "Bookings: Update by business owner" ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can update any booking
CREATE POLICY "Bookings: Admin update access" ON bookings
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Workers can delete their bookings (before acceptance)
CREATE POLICY "Bookings: Delete by worker" ON bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE workers.id = worker_id
      AND workers.user_id::text = auth.uid()::text
    )
    AND status = 'pending'
  );

-- Business owners can delete bookings
CREATE POLICY "Bookings: Delete by business owner" ON bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can delete any booking
CREATE POLICY "Bookings: Admin delete access" ON bookings
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Transactions Table Policies (NEW)
-- ----------------------------------------------------------------------------

-- Read access for booking participants
CREATE POLICY "Transactions: Read by participants" ON transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN workers ON workers.id = bookings.worker_id
      WHERE bookings.id = booking_id
      AND workers.user_id::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM bookings
      JOIN businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = booking_id
      AND businesses.user_id::text = auth.uid()::text
    )
    OR is_admin()
  );

-- Business owners can create transactions (payments)
CREATE POLICY "Transactions: Create by business owner" ON transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = booking_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can update transactions (for refunds)
CREATE POLICY "Transactions: Admin update access" ON transactions
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete transactions
CREATE POLICY "Transactions: Admin delete access" ON transactions
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Messages Table Policies
-- ----------------------------------------------------------------------------

-- Read access for sender or receiver
CREATE POLICY "Messages: Read by participants" ON messages
  FOR SELECT
  USING (
    sender_id::text = auth.uid()::text
    OR receiver_id::text = auth.uid()::text
    OR is_admin()
  );

-- Authenticated users can send messages
CREATE POLICY "Messages: Create by authenticated users" ON messages
  FOR INSERT
  WITH CHECK (sender_id::text = auth.uid()::text);

-- Users can update their own messages (mark as read)
CREATE POLICY "Messages: Update by receiver" ON messages
  FOR UPDATE
  USING (receiver_id::text = auth.uid()::text)
  WITH CHECK (receiver_id::text = auth.uid()::text);

-- Users can delete their own messages
CREATE POLICY "Messages: Delete by sender" ON messages
  FOR DELETE
  USING (sender_id::text = auth.uid()::text);

-- Admins can delete any message
CREATE POLICY "Messages: Admin delete access" ON messages
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Reviews Table Policies
-- ----------------------------------------------------------------------------

-- Public read access
CREATE POLICY "Reviews: Public read access" ON reviews
  FOR SELECT
  USING (true);

-- Business owners can create reviews for workers
CREATE POLICY "Reviews: Create by business owner" ON reviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = booking_id
      AND businesses.user_id::text = auth.uid()::text
      AND bookings.status = 'completed'
    )
  );

-- Review author can update their review
CREATE POLICY "Reviews: Update by author" ON reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = booking_id
      AND businesses.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = booking_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can update any review
CREATE POLICY "Reviews: Admin update access" ON reviews
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Review author can delete their review
CREATE POLICY "Reviews: Delete by author" ON reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = booking_id
      AND businesses.user_id::text = auth.uid()::text
    )
  );

-- Admins can delete any review
CREATE POLICY "Reviews: Admin delete access" ON reviews
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Notifications Table Policies
-- ----------------------------------------------------------------------------

-- Users can read their own notifications
CREATE POLICY "Notifications: Read by owner" ON notifications
  FOR SELECT
  USING (user_id::text = auth.uid()::text OR is_admin());

-- System can create notifications (via service role)
CREATE POLICY "Notifications: Create by service" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Notifications: Update by owner" ON notifications
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Admins can update any notification
CREATE POLICY "Notifications: Admin update access" ON notifications
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can delete their own notifications
CREATE POLICY "Notifications: Delete by owner" ON notifications
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- Admins can delete any notification
CREATE POLICY "Notifications: Admin delete access" ON notifications
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Reports Table Policies
-- ----------------------------------------------------------------------------

-- Users can read their own reports
CREATE POLICY "Reports: Read by reporter" ON reports
  FOR SELECT
  USING (reporter_id::text = auth.uid()::text OR is_admin());

-- Authenticated users can create reports
CREATE POLICY "Reports: Create by authenticated users" ON reports
  FOR INSERT
  WITH CHECK (reporter_id::text = auth.uid()::text);

-- Reporter can update their own reports
CREATE POLICY "Reports: Update by reporter" ON reports
  FOR UPDATE
  USING (reporter_id::text = auth.uid()::text)
  WITH CHECK (reporter_id::text = auth.uid()::text);

-- Admins can update any report
CREATE POLICY "Reports: Admin update access" ON reports
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reporter can delete their own reports
CREATE POLICY "Reports: Delete by reporter" ON reports
  FOR DELETE
  USING (reporter_id::text = auth.uid()::text);

-- Admins can delete any report
CREATE POLICY "Reports: Admin delete access" ON reports
  FOR DELETE
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- Webhooks Table Policies (NEW)
-- ----------------------------------------------------------------------------

-- Admins can read all webhooks
CREATE POLICY "Webhooks: Read by admins" ON webhooks
  FOR SELECT
  USING (is_admin());

-- Admins can create webhooks
CREATE POLICY "Webhooks: Create by admins" ON webhooks
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update webhooks
CREATE POLICY "Webhooks: Update by admins" ON webhooks
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete webhooks
CREATE POLICY "Webhooks: Delete by admins" ON webhooks
  FOR DELETE
  USING (is_admin());

-- ============================================================================
-- SECURITY INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes for frequently used authorization checks
CREATE INDEX IF NOT EXISTS idx_businesses_user_id_auth ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_user_id_auth ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_business_id_auth ON jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_id_auth ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id_auth ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id_auth ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id_auth ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_auth ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id_auth ON reports(reporter_id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

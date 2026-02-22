-- ============================================================================
-- Daily Worker Hub - Initial Schema Migration
-- ============================================================================
-- This migration creates the core tables for the Daily Worker Hub platform.
-- Version: 001
-- Date: 2026-02-22
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('worker', 'business');

-- Job status
CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');

-- Transaction types
CREATE TYPE transaction_type AS ENUM ('payment', 'refund');

-- Transaction status
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed');

-- Report types
CREATE TYPE report_type AS ENUM ('user', 'job', 'business', 'booking');

-- Report status
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users table (core authentication & profile data)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role user_role NOT NULL,
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Businesses table (business profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  address TEXT DEFAULT '',
  lat DECIMAL(10, 8) DEFAULT NULL,
  lng DECIMAL(11, 8) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ----------------------------------------------------------------------------
-- Workers table (worker profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  dob DATE DEFAULT NULL,
  address TEXT DEFAULT '',
  location_name TEXT DEFAULT '',
  lat DECIMAL(10, 8) DEFAULT NULL,
  lng DECIMAL(11, 8) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ----------------------------------------------------------------------------
-- Categories table (job categories)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Skills table (worker skills)
-- ----------------------------------------------------------------------------
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Jobs table
-- ----------------------------------------------------------------------------
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  requirements TEXT DEFAULT '',
  budget_min DECIMAL(12, 2) NOT NULL DEFAULT 0,
  budget_max DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status job_status NOT NULL DEFAULT 'open',
  deadline DATE DEFAULT NULL,
  address TEXT DEFAULT '',
  lat DECIMAL(10, 8) DEFAULT NULL,
  lng DECIMAL(11, 8) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Jobs skills junction table (many-to-many relationship)
-- ----------------------------------------------------------------------------
CREATE TABLE jobs_skills (
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

-- ----------------------------------------------------------------------------
-- Bookings table
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  final_price DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Transactions table
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  provider_transaction_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Messages table
-- ----------------------------------------------------------------------------
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Reviews table
-- ----------------------------------------------------------------------------
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, worker_id)
);

-- ----------------------------------------------------------------------------
-- Notifications table
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Reports table
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_type report_type NOT NULL,
  reported_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Webhooks table
-- ----------------------------------------------------------------------------
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Businesses indexes
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_is_verified ON businesses(is_verified);
CREATE INDEX idx_businesses_location ON businesses(lat, lng);

-- Workers indexes
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_location ON workers(lat, lng);
CREATE INDEX idx_workers_dob ON workers(dob);

-- Categories indexes
CREATE INDEX idx_categories_slug ON categories(slug);

-- Skills indexes
CREATE INDEX idx_skills_slug ON skills(slug);

-- Jobs indexes
CREATE INDEX idx_jobs_business_id ON jobs(business_id);
CREATE INDEX idx_jobs_category_id ON jobs(category_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_deadline ON jobs(deadline);
CREATE INDEX idx_jobs_location ON jobs(lat, lng);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

-- Jobs skills indexes
CREATE INDEX idx_jobs_skills_job_id ON jobs_skills(job_id);
CREATE INDEX idx_jobs_skills_skill_id ON jobs_skills(skill_id);

-- Bookings indexes
CREATE INDEX idx_bookings_job_id ON bookings(job_id);
CREATE INDEX idx_bookings_worker_id ON bookings(worker_id);
CREATE INDEX idx_bookings_business_id ON bookings(business_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_start_date ON bookings(start_date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Transactions indexes
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Messages indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Reviews indexes
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_worker_id ON reviews(worker_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Reports indexes
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_type ON reports(reported_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- Webhooks indexes
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_created_at ON webhooks(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Businesses policies
CREATE POLICY "Businesses are viewable by everyone" ON businesses FOR SELECT USING (true);
CREATE POLICY "Businesses can be updated by owner" ON businesses FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Workers policies
CREATE POLICY "Workers are viewable by everyone" ON workers FOR SELECT USING (true);
CREATE POLICY "Workers can be updated by owner" ON workers FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Categories policies
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Skills policies
CREATE POLICY "Skills are viewable by everyone" ON skills FOR SELECT USING (true);

-- Jobs policies
CREATE POLICY "Jobs are viewable by everyone" ON jobs FOR SELECT USING (true);
CREATE POLICY "Jobs can be created by businesses" ON jobs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = business_id AND businesses.user_id::text = auth.uid()::text)
);
CREATE POLICY "Jobs can be updated by business owner" ON jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = business_id AND businesses.user_id::text = auth.uid()::text)
);

-- Bookings policies
CREATE POLICY "Bookings are viewable by participants" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM workers WHERE workers.id = worker_id AND workers.user_id::text = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM businesses WHERE businesses.id = business_id AND businesses.user_id::text = auth.uid()::text)
);
CREATE POLICY "Bookings can be created by workers" ON bookings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workers WHERE workers.id = worker_id AND workers.user_id::text = auth.uid()::text)
);
CREATE POLICY "Bookings can be updated by business owner" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = business_id AND businesses.user_id::text = auth.uid()::text)
);

-- Messages policies
CREATE POLICY "Messages are viewable by sender or receiver" ON messages FOR SELECT USING (
  sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text
);
CREATE POLICY "Messages can be created by authenticated users" ON messages FOR INSERT WITH CHECK (
  sender_id::text = auth.uid()::text
);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Reviews can be created by business owner" ON reviews FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings
    JOIN businesses ON businesses.id = bookings.business_id
    WHERE bookings.id = booking_id AND businesses.user_id::text = auth.uid()::text
  )
);

-- Notifications policies
CREATE POLICY "Notifications are viewable by owner" ON notifications FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Notifications can be updated by owner" ON notifications FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Reports policies
CREATE POLICY "Reports are viewable by reporter" ON reports FOR SELECT USING (reporter_id::text = auth.uid()::text);
CREATE POLICY "Reports can be created by authenticated users" ON reports FOR INSERT WITH CHECK (reporter_id::text = auth.uid()::text);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

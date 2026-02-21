-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('payment', 'refund');
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE user_role AS ENUM ('worker', 'business', 'admin');
CREATE TYPE report_type AS ENUM ('user', 'job', 'business', 'booking');
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'worker',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- AUTH INTEGRATION - Auto-create user profile on signup
-- ============================================================================

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, return without error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON auth.users TO postgres;

-- ============================================================================
-- SKILLS TABLE
-- ============================================================================
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for skills
CREATE INDEX idx_skills_slug ON skills(slug);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================================================
-- BUSINESSES TABLE
-- ============================================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for businesses
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_location ON businesses(lat, lng);
CREATE INDEX idx_businesses_is_verified ON businesses(is_verified);

-- ============================================================================
-- WORKERS TABLE
-- ============================================================================
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  dob DATE,
  address TEXT,
  location_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for workers
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_location ON workers(lat, lng);

-- ============================================================================
-- JOBS TABLE
-- ============================================================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  budget_min NUMERIC(10, 2) NOT NULL,
  budget_max NUMERIC(10, 2) NOT NULL,
  status job_status NOT NULL DEFAULT 'open',
  deadline DATE,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for jobs
CREATE INDEX idx_jobs_business_id ON jobs(business_id);
CREATE INDEX idx_jobs_category_id ON jobs(category_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(lat, lng);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- ============================================================================
-- JOBS_SKILLS JUNCTION TABLE
-- ============================================================================
CREATE TABLE jobs_skills (
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

-- Indexes for jobs_skills
CREATE INDEX idx_jobs_skills_job_id ON jobs_skills(job_id);
CREATE INDEX idx_jobs_skills_skill_id ON jobs_skills(skill_id);

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  final_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for bookings
CREATE INDEX idx_bookings_job_id ON bookings(job_id);
CREATE INDEX idx_bookings_worker_id ON bookings(worker_id);
CREATE INDEX idx_bookings_business_id ON bookings(business_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Ensure one booking per job-worker combination
CREATE UNIQUE INDEX idx_bookings_job_worker ON bookings(job_id, worker_id) WHERE status IN ('accepted', 'in_progress');

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  provider_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_provider_transaction_id ON transactions(provider_transaction_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, worker_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_worker_id ON reviews(worker_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_type report_type NOT NULL,
  reported_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reports
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported ON reports(reported_type, reported_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- ============================================================================
-- WEBHOOKS TABLE
-- ============================================================================
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for webhooks
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR USERS TABLE
-- ============================================================================

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (is_admin());

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any user data
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- RLS POLICIES FOR WORKERS TABLE
-- ============================================================================

-- Workers can read their own profile
CREATE POLICY "Workers can read own profile"
  ON workers FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can read workers linked to verified user accounts
CREATE POLICY "Public can read workers of verified users"
  ON workers FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = workers.user_id
      AND users.email_confirmed_at IS NOT NULL
    )
  );

-- Admins can read all workers
CREATE POLICY "Admins can read all workers"
  ON workers FOR SELECT
  USING (is_admin());

-- Workers can update their own profile
CREATE POLICY "Workers can update own profile"
  ON workers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any worker
CREATE POLICY "Admins can update any worker"
  ON workers FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only authenticated users can insert worker profiles (via application layer)
CREATE POLICY "Authenticated users can insert workers"
  ON workers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can delete any worker
CREATE POLICY "Admins can delete any worker"
  ON workers FOR DELETE
  USING (is_admin());

-- ============================================================================
-- RLS POLICIES FOR BUSINESSES TABLE
-- ============================================================================

-- Businesses can read their own profile
CREATE POLICY "Businesses can read own profile"
  ON businesses FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can read verified businesses
CREATE POLICY "Public can read verified businesses"
  ON businesses FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = businesses.user_id
      AND users.email_confirmed_at IS NOT NULL
    )
    AND businesses.is_verified = TRUE
  );

-- Admins can read all businesses
CREATE POLICY "Admins can read all businesses"
  ON businesses FOR SELECT
  USING (is_admin());

-- Businesses can update their own profile
CREATE POLICY "Businesses can update own profile"
  ON businesses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any business
CREATE POLICY "Admins can update any business"
  ON businesses FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only authenticated users can insert business profiles (via application layer)
CREATE POLICY "Authenticated users can insert businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can delete any business
CREATE POLICY "Admins can delete any business"
  ON businesses FOR DELETE
  USING (is_admin());

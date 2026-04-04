-- 001_dispatch_system.sql
-- Dispatch System: Auto-assign jobs to online workers
-- Adds online status, dispatch queue, and dispatch history

-- =============================================
-- 1. Workers table - Add dispatch-related columns
-- =============================================

ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS online_since TIMESTAMPTZ;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS auto_offline_at TIMESTAMPTZ;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS current_lat NUMERIC(10, 7);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS current_lng NUMERIC(10, 7);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS max_distance_km INTEGER DEFAULT 20;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS preferred_categories UUID[] DEFAULT '{}';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_dispatches INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_accepted INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_rejected INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_timed_out INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avg_response_time_seconds NUMERIC;

-- =============================================
-- 2. Dispatch Queue table
-- =============================================

CREATE TABLE IF NOT EXISTS dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'timed_out', 'cancelled')),
  matching_score INTEGER,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response_time_seconds NUMERIC,
  dispatch_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. Worker Dispatch History table
-- =============================================

CREATE TABLE IF NOT EXISTS worker_dispatch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  dispatch_queue_id UUID REFERENCES dispatch_queue(id),
  action TEXT NOT NULL CHECK (action IN ('accepted', 'rejected', 'timed_out', 'cancelled')),
  response_time_seconds NUMERIC,
  worker_lat NUMERIC(10, 7),
  worker_lng NUMERIC(10, 7),
  distance_km NUMERIC,
  matching_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. Jobs table - Add dispatch columns
-- =============================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dispatch_mode TEXT DEFAULT 'manual' CHECK (dispatch_mode IN ('manual', 'auto'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'dispatching', 'fulfilled', 'exhausted', 'cancelled'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_dispatched INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_rejected INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_accept_top_worker BOOLEAN DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dispatch_timeout_seconds INTEGER DEFAULT 45;

-- =============================================
-- 5. Indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_workers_online ON workers (is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_job ON dispatch_queue (job_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_worker ON dispatch_queue (worker_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_expires ON dispatch_queue (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dispatch_history_worker ON worker_dispatch_history (worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_dispatch ON jobs (dispatch_status, dispatch_mode) WHERE status = 'open';

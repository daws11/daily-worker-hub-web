-- ============================================================================
-- SAVED_SEARCHES TABLE
-- ============================================================================
-- This table stores saved job search filters for workers

CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for saved_searches
CREATE INDEX idx_saved_searches_worker_id ON saved_searches(worker_id);
CREATE INDEX idx_saved_searches_is_favorite ON saved_searches(is_favorite);
CREATE INDEX idx_saved_searches_created_at ON saved_searches(created_at DESC);

-- Index for GIN queries on filters JSONB
CREATE INDEX idx_saved_searches_filters ON saved_searches USING GIN(filters);

-- Trigger to update updated_at column
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on saved_searches table
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Workers can read their own saved searches
CREATE POLICY "Workers can read own saved searches"
  ON saved_searches FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = saved_searches.worker_id
    )
  );

-- Workers can insert their own saved searches
CREATE POLICY "Workers can insert own saved searches"
  ON saved_searches FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = worker_id
    )
  );

-- Workers can update their own saved searches
CREATE POLICY "Workers can update own saved searches"
  ON saved_searches FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = saved_searches.worker_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = worker_id
    )
  );

-- Workers can delete their own saved searches
CREATE POLICY "Workers can delete own saved searches"
  ON saved_searches FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM workers WHERE id = saved_searches.worker_id
    )
  );

-- Admins can read all saved searches
CREATE POLICY "Admins can read all saved searches"
  ON saved_searches FOR SELECT
  USING (is_admin());

-- Admins can insert any saved search
CREATE POLICY "Admins can insert any saved search"
  ON saved_searches FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update any saved search
CREATE POLICY "Admins can update any saved search"
  ON saved_searches FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete any saved search
CREATE POLICY "Admins can delete any saved search"
  ON saved_searches FOR DELETE
  USING (is_admin());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE saved_searches IS 'Stores saved job search filters for workers';
COMMENT ON COLUMN saved_searches.worker_id IS 'Reference to the worker who owns this saved search';
COMMENT ON COLUMN saved_searches.name IS 'Display name for the saved search';
COMMENT ON COLUMN saved_searches.filters IS 'JSONB object containing filter parameters (keywords, category_ids, skill_ids, wage_min, wage_max, distance_radius, user_lat, user_lng, is_urgent, verified_only, start_date, end_date)';
COMMENT ON COLUMN saved_searches.is_favorite IS 'Flag to mark frequently used searches as favorites';

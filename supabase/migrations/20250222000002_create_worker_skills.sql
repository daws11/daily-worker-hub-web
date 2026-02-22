-- Create worker_skills junction table
-- This table creates a many-to-many relationship between workers and skills,
-- allowing workers to have multiple skills and skills to be associated with multiple workers.

CREATE TABLE IF NOT EXISTS public.worker_skills (
  -- Foreign key to workers table
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,

  -- Foreign key to skills table
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,

  -- Composite primary key ensures a worker can only have a skill once
  PRIMARY KEY (worker_id, skill_id),

  -- Timestamp for when the skill was added to the worker's profile
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_skills_worker_id ON public.worker_skills(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_skills_skill_id ON public.worker_skills(skill_id);

-- Add comment for documentation
COMMENT ON TABLE public.worker_skills IS 'Junction table linking workers to their skills (many-to-many relationship)';
COMMENT ON COLUMN public.worker_skills.worker_id IS 'Foreign key reference to the workers table';
COMMENT ON COLUMN public.worker_skills.skill_id IS 'Foreign key reference to the skills table';

-- Enable Row Level Security (RLS)
ALTER TABLE public.worker_skills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Workers can view their own skills
CREATE POLICY "Workers can view own skills"
  ON public.worker_skills
  FOR SELECT
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Policy: Workers can insert their own skills
CREATE POLICY "Workers can insert own skills"
  ON public.worker_skills
  FOR INSERT
  WITH CHECK (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Policy: Workers can delete their own skills
CREATE POLICY "Workers can delete own skills"
  ON public.worker_skills
  FOR DELETE
  USING (worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid()));

-- Policy: Admins can view all worker skills
CREATE POLICY "Admins can view all worker skills"
  ON public.worker_skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can insert skills for any worker
CREATE POLICY "Admins can insert skills for any worker"
  ON public.worker_skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete skills for any worker
CREATE POLICY "Admins can delete skills for any worker"
  ON public.worker_skills
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

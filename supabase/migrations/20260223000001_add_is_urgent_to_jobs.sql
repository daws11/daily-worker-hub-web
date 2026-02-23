-- Add is_urgent column to jobs table
-- This allows businesses to mark jobs as urgent for priority handling

ALTER TABLE public.jobs
ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.is_urgent IS 'Flag indicating if the job is marked as urgent for priority handling';

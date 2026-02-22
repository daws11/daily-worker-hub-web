-- Add actual time tracking fields to bookings table
-- This migration adds fields to track actual start and end times for reliability score calculation

-- Add actual_start_time field (timestamptz for precise start time tracking)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ;

-- Add actual_end_time field (timestamptz for precise end time tracking)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.actual_start_time IS 'Actual timestamp when the worker started the job (used for reliability score calculation)';
COMMENT ON COLUMN public.bookings.actual_end_time IS 'Actual timestamp when the worker completed the job (used for reliability score calculation)';

-- Create index for actual_start_time queries (useful for filtering by actual start time)
CREATE INDEX IF NOT EXISTS idx_bookings_actual_start_time ON public.bookings(actual_start_time);

-- Create index for actual_end_time queries (useful for filtering by actual end time)
CREATE INDEX IF NOT EXISTS idx_bookings_actual_end_time ON public.bookings(actual_end_time);

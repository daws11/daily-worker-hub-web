-- Create interview_sessions table for tracking interview process
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  worker_tier worker_tier NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  type TEXT NOT NULL DEFAULT 'chat' CHECK (type IN ('none', 'chat', 'chat_and_voice')),

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  chat_started_at TIMESTAMPTZ,
  chat_completed_at TIMESTAMPTZ,
  voice_started_at TIMESTAMPTZ,
  voice_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Durations (in seconds)
  chat_duration INTEGER,
  voice_duration INTEGER,
  total_duration INTEGER,

  -- Message tracking
  messages_sent INTEGER NOT NULL DEFAULT 0,
  voice_call_initiated BOOLEAN NOT NULL DEFAULT FALSE,

  -- Analytics
  time_to_hire NUMERIC(10,2), -- Time from job posting to booking acceptance (in minutes)

  -- Constraints
  CONSTRAINT unique_booking_interview UNIQUE(booking_id)
);

-- Create indexes for common queries
CREATE INDEX idx_interview_sessions_booking_id ON interview_sessions(booking_id);
CREATE INDEX idx_interview_sessions_business_id ON interview_sessions(business_id);
CREATE INDEX idx_interview_sessions_worker_id ON interview_sessions(worker_id);
CREATE INDEX idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX idx_interview_sessions_created_at ON interview_sessions(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE interview_sessions IS 'Tracks interview sessions between businesses and workers, including duration and completion status';
COMMENT ON COLUMN interview_sessions.status IS 'Current status of the interview: pending, in_progress, completed, skipped, failed';
COMMENT ON COLUMN interview_sessions.type IS 'Type of interview required: none (instant dispatch), chat only, or chat with voice call';
COMMENT ON COLUMN interview_sessions.time_to_hire IS 'Time from job posting to booking acceptance, measured in minutes';
COMMENT ON COLUMN interview_sessions.chat_duration IS 'Duration of chat interview in seconds';
COMMENT ON COLUMN interview_sessions.voice_duration IS 'Duration of voice call in seconds';

-- Create function to increment message count
CREATE OR REPLACE FUNCTION increment_interview_messages(session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE interview_sessions
  SET messages_sent = messages_sent + 1
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql;

-- Add interview_status and interview_duration columns to bookings table for backward compatibility
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS interview_status TEXT CHECK (interview_status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
ADD COLUMN IF NOT EXISTS interview_duration INTEGER, -- Duration in seconds
ADD COLUMN IF NOT EXISTS time_to_hire NUMERIC(10,2); -- Time in minutes

-- Create index for interview status queries
CREATE INDEX IF NOT EXISTS idx_bookings_interview_status ON bookings(interview_status);

-- Add comments for new booking columns
COMMENT ON COLUMN bookings.interview_status IS 'Interview status for the booking (legacy field, use interview_sessions table)';
COMMENT ON COLUMN bookings.interview_duration IS 'Duration of interview in seconds (legacy field, use interview_sessions table)';
COMMENT ON COLUMN bookings.time_to_hire IS 'Time from job posting to booking acceptance in minutes';

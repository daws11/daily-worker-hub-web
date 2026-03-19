-- Add check-in location tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_latitude DECIMAL(10, 8);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_longitude DECIMAL(11, 8);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_accuracy INTEGER;

-- Add reviewer type to reviews for two-way reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_type TEXT DEFAULT 'business'
  CHECK (reviewer_type IN ('business', 'worker'));

-- Add business_id to reviews for worker→business reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- Add index for cron job queries (auto-release pending payments)
CREATE INDEX IF NOT EXISTS idx_bookings_auto_release ON bookings(status, payment_status, review_deadline)
  WHERE status = 'completed' AND payment_status = 'pending_review';

-- Add comments for documentation
COMMENT ON COLUMN bookings.check_in_latitude IS 'GPS latitude when worker checked in';
COMMENT ON COLUMN bookings.check_in_longitude IS 'GPS longitude when worker checked in';
COMMENT ON COLUMN bookings.check_in_accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN reviews.reviewer_type IS 'Who submitted the review: business or worker';

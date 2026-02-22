-- Add booking_notes column to bookings table
-- This allows businesses to add notes about workers for future reference

ALTER TABLE public.bookings
ADD COLUMN booking_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.booking_notes IS 'Optional notes added by businesses about workers for future reference';

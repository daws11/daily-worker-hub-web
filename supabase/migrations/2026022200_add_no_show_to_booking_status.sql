-- Migration: Add no_show to booking_status enum
-- Date: 2026-02-22
-- Description: Add 'no_show' status for workers who don't show up

-- Add no_show value to booking_status enum
ALTER TYPE booking_status ADD VALUE 'no_show';

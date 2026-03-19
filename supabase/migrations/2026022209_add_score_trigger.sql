-- Add trigger to auto-calculate reliability score when booking completes
-- This trigger fires when a booking status changes to 'completed' and recalculates
-- the worker's reliability score using the formula: 40% attendance + 30% punctuality + 30% ratings

-- ============================================================================
-- FUNCTION: calculate_reliability_score
-- ============================================================================
-- This function calculates a worker's reliability score based on their booking history
CREATE OR REPLACE FUNCTION public.calculate_reliability_score(p_worker_id UUID)
RETURNS NUMERIC(3, 2) AS $$
DECLARE
  -- Counters for calculation
  v_total_bookings INTEGER;
  v_completed_bookings INTEGER;
  v_cancelled_bookings INTEGER;
  v_attendance_rate NUMERIC(5, 2);
  v_punctuality_rate NUMERIC(5, 2);
  v_on_time_bookings INTEGER;
  v_avg_rating NUMERIC(3, 2);
  v_reliability_score NUMERIC(3, 2);
  v_no_show_threshold INTEGER := 5; -- Minimum completed jobs for reliable score
BEGIN
  -- Count total relevant bookings (completed and cancelled)
  SELECT COUNT(*)
  INTO v_total_bookings
  FROM public.bookings
  WHERE worker_id = p_worker_id
    AND status IN ('completed', 'cancelled');

  -- Count completed bookings
  SELECT COUNT(*)
  INTO v_completed_bookings
  FROM public.bookings
  WHERE worker_id = p_worker_id
    AND status = 'completed';

  -- Calculate attendance rate (completed / total * 100)
  -- If no bookings, default to 100% (optimistic for new workers)
  IF v_total_bookings > 0 THEN
    v_attendance_rate := (v_completed_bookings::NUMERIC / v_total_bookings::NUMERIC) * 100;
  ELSE
    v_attendance_rate := 100.0;
  END IF;

  -- Calculate punctuality rate
  -- Punctuality = % of completed bookings where worker started on scheduled date
  -- For now, we consider a booking punctual if actual_start_time is set
  -- This can be refined later when we have scheduled_start_time
  IF v_completed_bookings > 0 THEN
    SELECT COUNT(*)
    INTO v_on_time_bookings
    FROM public.bookings
    WHERE worker_id = p_worker_id
      AND status = 'completed'
      AND actual_start_time IS NOT NULL;

    v_punctuality_rate := (v_on_time_bookings::NUMERIC / v_completed_bookings::NUMERIC) * 100;
  ELSE
    v_punctuality_rate := 100.0;
  END IF;

  -- Calculate average rating from reviews
  SELECT COALESCE(AVG(rating), 5.0)
  INTO v_avg_rating
  FROM public.reviews
  WHERE worker_id = p_worker_id;

  -- Calculate reliability score using weighted formula:
  -- 40% attendance + 30% punctuality + 30% ratings
  -- All components are normalized to 1-5 scale

  -- Convert percentages to 1-5 scale
  v_attendance_rate := GREATEST(1.0, LEAST(5.0, (v_attendance_rate / 100) * 5));
  v_punctuality_rate := GREATEST(1.0, LEAST(5.0, (v_punctuality_rate / 100) * 5));
  v_avg_rating := GREATEST(1.0, LEAST(5.0, v_avg_rating));

  -- Apply weights: 40% attendance, 30% punctuality, 30% ratings
  v_reliability_score := (v_attendance_rate * 0.40) + (v_punctuality_rate * 0.30) + (v_avg_rating * 0.30);

  -- Round to 2 decimal places and ensure within 1-5 range
  v_reliability_score := ROUND(v_reliability_score::NUMERIC, 2);
  v_reliability_score := GREATEST(1.0, LEAST(5.0, v_reliability_score));

  RETURN v_reliability_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: update_reliability_score_for_booking
-- ============================================================================
-- This function updates the worker's reliability score when their booking completes
-- It also creates a history record for audit trail
CREATE OR REPLACE FUNCTION public.update_reliability_score_for_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_new_score NUMERIC(3, 2);
  v_attendance_rate NUMERIC(5, 2);
  v_punctuality_rate NUMERIC(5, 2);
  v_avg_rating NUMERIC(3, 2);
  v_completed_bookings INTEGER;
BEGIN
  -- Only proceed when status changes to 'completed'
  IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
    -- Calculate the new reliability score
    v_new_score := public.calculate_reliability_score(NEW.worker_id);

    -- Get the component values for history tracking
    -- Recalculate to store the breakdown
    SELECT
      COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled')),
      COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_completed_bookings, v_completed_bookings
    FROM public.bookings
    WHERE worker_id = NEW.worker_id;

    -- Calculate attendance rate for history
    IF v_completed_bookings > 0 THEN
      SELECT
        (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled'))::NUMERIC) * 100
      INTO v_attendance_rate
      FROM public.bookings
      WHERE worker_id = NEW.worker_id;
    ELSE
      v_attendance_rate := 100.0;
    END IF;

    -- Calculate punctuality rate for history
    IF v_completed_bookings > 0 THEN
      SELECT
        (COUNT(*) FILTER (WHERE actual_start_time IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC) * 100
      INTO v_punctuality_rate
      FROM public.bookings
      WHERE worker_id = NEW.worker_id AND status = 'completed';
    ELSE
      v_punctuality_rate := 100.0;
    END IF;

    -- Get average rating
    SELECT COALESCE(AVG(rating), 5.0)
    INTO v_avg_rating
    FROM public.reviews
    WHERE worker_id = NEW.worker_id;

    -- Update the worker's reliability score
    UPDATE public.workers
    SET reliability_score = v_new_score,
        updated_at = NOW()
    WHERE id = NEW.worker_id;

    -- Create a history record for audit trail
    INSERT INTO public.reliability_score_history (
      worker_id,
      score,
      attendance_rate,
      punctuality_rate,
      avg_rating,
      completed_jobs_count,
      calculated_at
    ) VALUES (
      NEW.worker_id,
      v_new_score,
      v_attendance_rate,
      v_punctuality_rate,
      v_avg_rating,
      v_completed_bookings,
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the booking update
    RAISE WARNING 'Failed to update reliability score for worker %: %', NEW.worker_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: trigger_recalculate_reliability_score
-- ============================================================================
-- This trigger fires after a booking is updated and recalculates the worker's score

-- Drop trigger if exists (to allow recreation)
DROP TRIGGER IF EXISTS trigger_recalculate_reliability_score ON public.bookings;

-- Create the trigger
CREATE TRIGGER trigger_recalculate_reliability_score
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reliability_score_for_booking();

-- Add comments for documentation
COMMENT ON FUNCTION public.calculate_reliability_score IS 'Calculates a worker''s reliability score (1-5) using weighted formula: 40% attendance + 30% punctuality + 30% ratings';
COMMENT ON FUNCTION public.update_reliability_score_for_booking IS 'Trigger function that updates worker reliability score when booking completes and creates history record';
COMMENT ON TRIGGER trigger_recalculate_reliability_score ON public.bookings IS 'Auto-calculates and updates worker reliability score when booking status changes to completed';

-- Grant necessary permissions for the trigger functions
GRANT EXECUTE ON FUNCTION public.calculate_reliability_score(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.update_reliability_score_for_booking() TO postgres;

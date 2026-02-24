// ============================================================================
// Reliability Score Edge Function
// ============================================================================
// Calculates and updates worker reliability scores based on:
// - Booking completion rate (attendance) - 40% weight
// - Punctuality rate (on-time arrival/completion) - 30% weight
// - Average rating from reviews - 30% weight
//
// POST /functions/v1/reliability-score
// Body: { worker_id: string }
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { worker_id } = await req.json()

    if (!worker_id) {
      return new Response(
        JSON.stringify({ error: 'worker_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate date 90 days ago
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    // Get completed bookings in last 90 days with time tracking data
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, created_at, start_date, end_date, actual_start_time, actual_end_time')
      .eq('worker_id', worker_id)
      .gte('created_at', ninetyDaysAgo)

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
    }

    // Calculate completion rate (attendance)
    const totalBookings = bookings?.length || 0
    const completedBookings = bookings?.filter(b => b.status === 'completed') || []
    const completedCount = completedBookings.length
    const completionRate = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 100

    // Calculate punctuality rate
    // A booking is punctual if:
    // 1. Worker started on or before the scheduled start date (with 1 hour grace period)
    // 2. Worker finished on or before the scheduled end date (with 1 hour grace period)
    let punctualCount = 0
    let bookingsWithTimeData = 0

    for (const booking of completedBookings) {
      if (booking.actual_start_time && booking.actual_end_time && booking.start_date && booking.end_date) {
        bookingsWithTimeData++

        // Convert dates to timestamps for comparison
        // start_date and end_date are DATE, so we compare against end of day
        const scheduledStart = new Date(booking.start_date)
        scheduledStart.setHours(9, 0, 0, 0) // Assume 9 AM as start of business day

        const scheduledEnd = new Date(booking.end_date)
        scheduledEnd.setHours(17, 0, 0, 0) // Assume 5 PM as end of business day

        const actualStart = new Date(booking.actual_start_time)
        const actualEnd = new Date(booking.actual_end_time)

        // Add 1 hour grace period for arrival
        const gracePeriodStart = new Date(scheduledStart)
        gracePeriodStart.setHours(gracePeriodStart.getHours() + 1)

        // Add 1 hour grace period for completion
        const gracePeriodEnd = new Date(scheduledEnd)
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 1)

        // Check if punctual (on time within grace period)
        const arrivedOnTime = actualStart <= gracePeriodStart
        const finishedOnTime = actualEnd <= gracePeriodEnd

        if (arrivedOnTime && finishedOnTime) {
          punctualCount++
        }
      }
    }

    const punctualityRate = bookingsWithTimeData > 0
      ? (punctualCount / bookingsWithTimeData) * 100
      : 100 // Default to 100% if no time data available

    // Get average rating from reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', worker_id)

    if (reviewsError) {
      throw new Error(`Failed to fetch reviews: ${reviewsError.message}`)
    }

    const totalReviews = reviews?.length || 0
    const avgRating = totalReviews > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 3.0

    // Calculate reliability score using 40/30/30 formula
    // Formula: (attendance_rate * 0.4) + (punctuality_rate * 0.3) + (avg_rating / 5 * 100 * 0.3)
    const ratingScore = (avgRating / 5) * 100
    const reliabilityScore = (completionRate * 0.4) + (punctualityRate * 0.3) + (ratingScore * 0.3)

    // Normalize to 1-5 scale
    const normalizedScore = Math.max(1, Math.min(5, reliabilityScore / 20))

    // Record score history
    await supabase
      .from('reliability_score_history')
      .insert({
        worker_id: worker_id,
        score: Number(normalizedScore.toFixed(2)),
        attendance_rate: Number(completionRate.toFixed(2)),
        punctuality_rate: Number(punctualityRate.toFixed(2)),
        avg_rating: Number(avgRating.toFixed(2)),
        completed_jobs_count: completedCount
      })

    // Update the worker's reliability score
    await supabase
      .from('workers')
      .update({
        reliability_score: Number(normalizedScore.toFixed(2)),
        updated_at: new Date().toISOString()
      })
      .eq('id', worker_id)

    return new Response(
      JSON.stringify({
        success: true,
        worker_id,
        reliability_score: Number(normalizedScore.toFixed(2)),
        metrics: {
          total_bookings: totalBookings,
          completed_bookings: completedCount,
          attendance_rate: Number(completionRate.toFixed(2)),
          punctual_bookings: punctualCount,
          bookings_with_time_data: bookingsWithTimeData,
          punctuality_rate: Number(punctualityRate.toFixed(2)),
          total_reviews: totalReviews,
          avg_rating: Number(avgRating.toFixed(2)),
          period_days: 90
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

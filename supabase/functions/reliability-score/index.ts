// ============================================================================
// Reliability Score Edge Function
// ============================================================================
// Calculates and updates worker reliability scores based on:
// - Booking completion rate (attendance)
// - Average rating from reviews
// - Recent activity (last 90 days)
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

    // Get completed bookings in last 90 days
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, created_at')
      .eq('worker_id', worker_id)
      .gte('created_at', ninetyDaysAgo)

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
    }

    // Calculate completion rate
    const totalBookings = bookings?.length || 0
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 100

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

    // Calculate reliability score
    // Formula: (completion_rate * 0.5) + (avg_rating / 5 * 100 * 0.5)
    // This gives equal weight to completion rate and rating
    const ratingScore = (avgRating / 5) * 100
    const reliabilityScore = (completionRate * 0.5) + (ratingScore * 0.5)

    // Normalize to 1-5 scale
    const normalizedScore = Math.max(1, Math.min(5, reliabilityScore / 20))

    // Return the calculated score
    // Note: The workers table doesn't have reliability_score column yet.
    // When the column is added, uncomment the update code below:
    /*
    await supabase
      .from('workers')
      .update({
        reliability_score: normalizedScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', worker_id)
    */

    return new Response(
      JSON.stringify({
        success: true,
        worker_id,
        reliability_score: Number(normalizedScore.toFixed(2)),
        metrics: {
          total_bookings: totalBookings,
          completed_bookings: completedBookings,
          completion_rate: Number(completionRate.toFixed(2)),
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

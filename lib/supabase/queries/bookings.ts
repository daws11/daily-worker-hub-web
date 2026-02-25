import { supabase } from "../client"
import type { Database } from "../types"

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"]
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"]

export type JobBookingWithDetails = BookingRow & {
  // Attendance fields (may not be in current DB schema but needed for feature)
  check_in_at?: string | null
  check_out_at?: string | null
  check_in_lat?: number | null
  check_in_lng?: number | null
  check_out_lat?: number | null
  check_out_lng?: number | null
  booking_notes?: string | null
  worker?: {
    id: string
    full_name: string
    avatar_url: string
    phone: string
    bio: string
  }
  business?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  job?: {
    id: string
    title: string
    description?: string
    budget_min?: number
    budget_max?: number
    deadline?: string
    address?: string
    lat?: number
    lng?: number
  }
  wallet_transaction?: {
    id: string
    amount: number
    type: 'earn' | 'payout' | 'refund' | 'hold' | 'release'
    status: 'pending_review' | 'available' | 'released' | 'disputed' | 'cancelled'
    description: string | null
    created_at: string
  } | null
}

/**
 * Get all bookings for a specific job
 */
export async function getJobBookings(jobId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url,
          phone,
          bio
        ),
        business:businesses!inner(
          id,
          name
        ),
        wallet_transaction:wallet_transactions(
          id,
          amount,
          type,
          status,
          description,
          created_at
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching job bookings:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching job bookings:', error)
    return { data: null, error }
  }
}

/**
 * Get bookings for a worker
 */
export async function getWorkerBookings(workerId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        job:jobs!inner(
          id,
          title,
          description,
          budget_min,
          budget_max,
          deadline,
          address,
          lat,
          lng
        ),
        business:businesses!inner(
          id,
          name,
          phone,
          email
        ),
        wallet_transaction:wallet_transactions(
          id,
          amount,
          type,
          status,
          description,
          created_at
        )
      `)
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worker bookings:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker bookings:', error)
    return { data: null, error }
  }
}

/**
 * Get bookings for a business
 */
export async function getBusinessBookings(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url,
          phone,
          bio
        ),
        job:jobs!inner(
          id,
          title,
          description,
          budget_min,
          budget_max
        ),
        wallet_transaction:wallet_transactions(
          id,
          amount,
          type,
          status,
          description,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching business bookings:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business bookings:', error)
    return { data: null, error }
  }
}

/**
 * Get a single booking by ID
 */
export async function getBookingById(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url,
          phone,
          bio
        ),
        business:businesses!inner(
          id,
          name,
          phone,
          email
        ),
        job:jobs!inner(
          id,
          title,
          description,
          budget_min,
          budget_max
        ),
        wallet_transaction:wallet_transactions(
          id,
          amount,
          type,
          status,
          description,
          created_at
        )
      `)
      .eq('id', bookingId)
      .single()

    if (error) {
      console.error('Error fetching booking:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching booking:', error)
    return { data: null, error }
  }
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating booking status:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error updating booking status:', error)
    return { data: null, error }
  }
}

/**
 * Update multiple booking statuses at once (bulk action)
 */
export async function updateMultipleBookingStatuses(
  bookingIds: string[],
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', bookingIds)
      .select()

    if (error) {
      console.error('Error updating multiple booking statuses:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error updating multiple booking statuses:', error)
    return { data: null, error }
  }
}

/**
 * Add or update booking notes
 */
export async function addBookingNotes(bookingId: string, notes: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ booking_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      console.error('Error adding booking notes:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error adding booking notes:', error)
    return { data: null, error }
  }
}

/**
 * Create a new booking
 */
export async function createBooking(booking: Omit<BookingRow, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error creating booking:', error)
    return { data: null, error }
  }
}

/**
 * Delete a booking
 */
export async function deleteBooking(bookingId: string) {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (error) {
      console.error('Error deleting booking:', error)
      return { error }
    }

    return { error: null }
  } catch (error) {
    console.error('Unexpected error deleting booking:', error)
    return { error }
  }
}

/**
 * Calculate reliability score for a worker (1-5 stars)
 * Based on: attendance rate, punctuality, and average ratings from reviews
 *
 * @param bookings - Array of worker's bookings
 * @param averageRating - Average rating from reviews (null if no reviews)
 * @returns Reliability score from 1.0 to 5.0
 */
export function calculateReliabilityScore(
  bookings: Array<{
    status: string
    check_in_at?: string | null
    check_out_at?: string | null
  }>,
  averageRating: number | null = null
): number {
  if (!bookings || bookings.length === 0) {
    return 3.0 // Default score for new workers
  }

  const completedBookings = bookings.filter(b => b.status === 'completed')
  const totalBookings = bookings.length

  if (completedBookings.length === 0) {
    return 2.5 // Lower score if no completed bookings
  }

  // 1. Attendance Score (40% weight): % of completed vs total
  const attendanceRate = completedBookings.length / totalBookings
  const attendanceScore = attendanceRate * 5.0

  // 2. Punctuality Score (30% weight): % of bookings with check-ins
  const bookingsWithCheckIn = completedBookings.filter(booking => booking.check_in_at !== null && booking.check_in_at !== undefined)
  const punctualityRate = completedBookings.length > 0
    ? bookingsWithCheckIn.length / completedBookings.length
    : 0
  const punctualityScore = punctualityRate * 5.0

  // 3. Rating Score (30% weight): Average rating from reviews
  const ratingScore = averageRating !== null && averageRating > 0
    ? averageRating
    : 4.0 // Default to 4.0 if no ratings yet

  // Calculate weighted average
  const weightedScore = (
    (attendanceScore * 0.40) +
    (punctualityScore * 0.30) +
    (ratingScore * 0.30)
  )

  // Clamp between 1.0 and 5.0
  return Math.max(1.0, Math.min(5.0, weightedScore))
}

/**
 * Get reliability score breakdown for a worker
 * Returns detailed metrics used in score calculation
 */
export async function getWorkerReliabilityMetrics(workerId: string) {
  try {
    // Fetch bookings data
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('status, check_in_at, check_out_at')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching worker reliability metrics:', bookingsError)
      return { data: null, error: bookingsError }
    }

    // Fetch average rating from reviews
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', workerId)
      .eq('reviewer', 'business')

    if (reviewsError) {
      console.error('Error fetching worker reviews for reliability:', reviewsError)
      return { data: null, error: reviewsError }
    }

    const bookings = (bookingsData || []) as unknown as Array<{
      status: string
      check_in_at?: string | null
      check_out_at?: string | null
    }>
    const completedBookings = bookings.filter(b => b.status === 'completed')
    const totalBookings = bookings.length

    // Calculate attendance
    const attendanceRate = totalBookings > 0
      ? (completedBookings.length / totalBookings) * 100
      : 0

    // Calculate punctuality
    const bookingsWithCheckIn = completedBookings.filter(booking => booking.check_in_at !== null && booking.check_in_at !== undefined)
    const punctualityRate = completedBookings.length > 0
      ? (bookingsWithCheckIn.length / completedBookings.length) * 100
      : 0

    // Calculate average rating from reviews
    let avgRating: number | null = null
    if (reviewsData && reviewsData.length > 0) {
      const sum = reviewsData.reduce((acc, review) => acc + (review.rating || 0), 0)
      avgRating = sum / reviewsData.length
    }

    const metrics = {
      totalBookings,
      completedBookings: completedBookings.length,
      attendanceRate: Math.round(attendanceRate),
      punctualityRate: Math.round(punctualityRate),
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reliabilityScore: calculateReliabilityScore(bookings, avgRating)
    }

    return { data: metrics, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker reliability metrics:', error)
    return { data: null, error }
  }
}

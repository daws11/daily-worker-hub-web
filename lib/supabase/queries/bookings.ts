import { supabase } from "../client"
import type { Database } from "../types"

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"]
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"]

export type JobBookingWithDetails = BookingRow & {
  worker: {
    id: string
    full_name: string
    avatar_url: string
    phone: string
    bio: string
  }
  business: {
    id: string
    name: string
  }
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
          deadline
        ),
        business:businesses!inner(
          id,
          name,
          phone,
          email
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
    // First, fetch the booking with related data to create notification
    const { data: bookingData, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        worker_id,
        job_id,
        status,
        worker:workers!inner(id, user_id),
        business:businesses!inner(id, name),
        job:jobs!inner(id, title)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError) {
      console.error('Error fetching booking for notification:', fetchError)
      return { data: null, error: fetchError }
    }

    if (!bookingData) {
      console.error('Booking not found:', bookingId)
      return { data: null, error: new Error('Booking not found') }
    }

    // Update the booking status
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

    // Create notification for status change
    if (bookingData.worker && bookingData.business && bookingData.job) {
      const notificationResult = await createBookingNotification(
        bookingData.worker_id,
        bookingData.business.name,
        bookingData.job.title,
        status,
        bookingId
      )

      if (notificationResult.error) {
        console.error('Error creating booking notification:', notificationResult.error)
        // Don't fail the status update if notification fails
      }
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
    // First, fetch all bookings with related data to create notifications
    const { data: bookingsData, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        worker_id,
        job_id,
        status,
        worker:workers!inner(id, user_id),
        business:businesses!inner(id, name),
        job:jobs!inner(id, title)
      `)
      .in('id', bookingIds)

    if (fetchError) {
      console.error('Error fetching bookings for notifications:', fetchError)
      return { data: null, error: fetchError }
    }

    // Update the booking statuses
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', bookingIds)
      .select()

    if (error) {
      console.error('Error updating multiple booking statuses:', error)
      return { data: null, error }
    }

    // Create notifications for each booking
    if (bookingsData) {
      for (const booking of bookingsData) {
        if (booking.worker && booking.business && booking.job) {
          const notificationResult = await createBookingNotification(
            booking.worker_id,
            booking.business.name,
            booking.job.title,
            status,
            booking.id
          )

          if (notificationResult.error) {
            console.error('Error creating booking notification:', notificationResult.error)
            // Don't fail the bulk update if individual notification fails
          }
        }
      }
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
 * Based on: attendance rate, punctuality, and average ratings
 *
 * @param bookings - Array of worker's bookings with ratings
 * @returns Reliability score from 1.0 to 5.0
 */
export function calculateReliabilityScore(bookings: Array<{
  status: string
  rating?: number | null
  checked_in_at?: string | null
  shift_start_time?: string | null
}>): number {
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

  // 2. Punctuality Score (30% weight): % of on-time check-ins
  const onTimeBookings = completedBookings.filter(booking => {
    if (!booking.checked_in_at || !booking.shift_start_time) {
      return false
    }
    const checkInTime = new Date(booking.checked_in_at)
    const startTime = new Date(booking.shift_start_time)
    // Consider on-time if checked in within 15 minutes of start
    const diffMinutes = (checkInTime.getTime() - startTime.getTime()) / (1000 * 60)
    return diffMinutes >= -15 && diffMinutes <= 15
  })
  const punctualityRate = completedBookings.length > 0
    ? onTimeBookings.length / completedBookings.length
    : 0
  const punctualityScore = punctualityRate * 5.0

  // 3. Rating Score (30% weight): Average rating from completed bookings
  const bookingsWithRatings = completedBookings.filter(b => b.rating !== null && b.rating !== undefined)
  const avgRating = bookingsWithRatings.length > 0
    ? bookingsWithRatings.reduce((sum, b) => sum + (b.rating || 0), 0) / bookingsWithRatings.length
    : 4.0 // Default to 4.0 if no ratings yet
  const ratingScore = avgRating

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
    const { data, error } = await supabase
      .from('bookings')
      .select('status, rating, checked_in_at, shift_start_time')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worker reliability metrics:', error)
      return { data: null, error }
    }

    const bookings = data || []
    const completedBookings = bookings.filter(b => b.status === 'completed')
    const totalBookings = bookings.length

    // Calculate attendance
    const attendanceRate = totalBookings > 0
      ? (completedBookings.length / totalBookings) * 100
      : 0

    // Calculate punctuality
    const onTimeBookings = completedBookings.filter(booking => {
      if (!booking.checked_in_at || !booking.shift_start_time) {
        return false
      }
      const checkInTime = new Date(booking.checked_in_at)
      const startTime = new Date(booking.shift_start_time)
      const diffMinutes = (checkInTime.getTime() - startTime.getTime()) / (1000 * 60)
      return diffMinutes >= -15 && diffMinutes <= 15
    })
    const punctualityRate = completedBookings.length > 0
      ? (onTimeBookings.length / completedBookings.length) * 100
      : 0

    // Calculate average rating
    const bookingsWithRatings = completedBookings.filter(b => b.rating !== null && b.rating !== undefined)
    const avgRating = bookingsWithRatings.length > 0
      ? bookingsWithRatings.reduce((sum, b) => sum + (b.rating || 0), 0) / bookingsWithRatings.length
      : null

    const metrics = {
      totalBookings,
      completedBookings: completedBookings.length,
      attendanceRate: Math.round(attendanceRate),
      punctualityRate: Math.round(punctualityRate),
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reliabilityScore: calculateReliabilityScore(bookings)
    }

    return { data: metrics, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker reliability metrics:', error)
    return { data: null, error }
  }
}

/**
 * Create a notification for booking status changes
 * Sends notification to worker when booking status is updated
 *
 * @param workerId - The worker's user ID to notify
 * @param workerName - The worker's name for personalization
 * @param businessName - The business name making the status change
 * @param jobTitle - The job title
 * @param status - The new booking status
 * @param bookingId - The booking ID for link
 * @returns The created notification or error
 */
export async function createBookingNotification(
  workerId: string,
  businessName: string,
  jobTitle: string,
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
  bookingId: string
) {
  try {
    // Get worker's user_id from workers table
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('user_id')
      .eq('id', workerId)
      .single()

    if (workerError) {
      console.error('Error fetching worker user_id:', workerError)
      return { data: null, error: workerError }
    }

    if (!worker) {
      console.error('Worker not found:', workerId)
      return { data: null, error: new Error('Worker not found') }
    }

    // Generate notification title and body based on status
    let title = ''
    let body = ''
    let link = `/dashboard-worker-bookings/${bookingId}`

    switch (status) {
      case 'accepted':
        title = 'Penerimaan Lamaran Diterima!'
        body = `Selamat! Lamaran Anda untuk pekerjaan "${jobTitle}" dari ${businessName} telah diterima.`
        break
      case 'rejected':
        title = 'Lamaran Belum Diterima'
        body = `Mohon maaf, lamaran Anda untuk pekerjaan "${jobTitle}" dari ${businessName} belum dapat diterima.`
        break
      case 'in_progress':
        title = 'Pekerjaan Dimulai'
        body = `Pekerjaan "${jobTitle}" dari ${businessName} telah dimulai. Semangat bekerja!`
        break
      case 'completed':
        title = 'Pekerjaan Selesai'
        body = `Pekerjaan "${jobTitle}" dari ${businessName} telah selesai. Terima kasih atas kerja keras Anda!`
        break
      case 'cancelled':
        title = 'Pekerjaan Dibatalkan'
        body = `Pekerjaan "${jobTitle}" dari ${businessName} telah dibatalkan.`
        break
      default:
        title = 'Status Lamaran Diperbarui'
        body = `Status lamaran Anda untuk pekerjaan "${jobTitle}" dari ${businessName} telah diperbarui.`
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: worker.user_id,
        title,
        body,
        link,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booking notification:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error creating booking notification:', error)
    return { data: null, error }
  }
}

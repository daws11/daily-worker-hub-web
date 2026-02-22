import { supabase } from '../client'
import type { Database } from '../types'
import type {
  AttendanceRecord,
  AttendanceWithRelations,
  CheckInData,
  CheckOutData,
  AttendanceStats,
  WorkerAttendanceHistory,
  JobAttendanceHistory,
  AttendanceListResponse,
  LocationVerificationResult,
} from '../../types/attendance'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']
type JobRow = Database['public']['Tables']['jobs']['Row']
type BusinessRow = Database['public']['Tables']['businesses']['Row']

/**
 * Check in a worker for a booking
 * Updates check_in timestamp, GPS coordinates, and changes status to 'in_progress'
 */
export async function checkIn(
  bookingId: string,
  lat?: number,
  lng?: number
) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        check_in_at: new Date().toISOString(),
        check_in_lat: lat ?? null,
        check_in_lng: lng ?? null,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      } as BookingUpdate)
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    if (data) {
      await createCheckInNotification(data.id)
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Check out a worker from a booking
 * Updates check_out timestamp, GPS coordinates, and changes status to 'completed'
 */
export async function checkOut(
  bookingId: string,
  lat?: number,
  lng?: number
) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        check_out_at: new Date().toISOString(),
        check_out_lat: lat ?? null,
        check_out_lng: lng ?? null,
        status: 'completed',
        updated_at: new Date().toISOString(),
      } as BookingUpdate)
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      return { data: null, error }
    }

    if (data) {
      await createCheckOutNotification(data.id)
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Get attendance history for a specific job
 */
export async function getJobAttendanceHistory(
  jobId: string
): Promise<{ data: JobAttendanceHistory | null; error: any }> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        job:jobs!inner(
          id,
          title,
          address,
          lat,
          lng
        ),
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching job attendance history:', error)
      return { data: null, error }
    }

    if (!bookings || bookings.length === 0) {
      return {
        data: {
          job_id: jobId,
          job_title: '',
          records: [],
          stats: {
            total_bookings: 0,
            checked_in_bookings: 0,
            checked_out_bookings: 0,
            attendance_rate: 0,
            on_time_arrivals: 0,
          },
        },
        error: null,
      }
    }

    const jobTitle = bookings[0]?.job?.title || ''
    const records = bookings.map((booking) => {
      const jobLat = booking.job?.lat ?? 0
      const jobLng = booking.job?.lng ?? 0
      const checkInLat = booking.check_in_lat ?? 0
      const checkInLng = booking.check_in_lng ?? 0
      const checkOutLat = booking.check_out_lat ?? 0
      const checkOutLng = booking.check_out_lng ?? 0

      return {
        ...booking,
        job: booking.job!,
        worker: booking.worker!,
        check_in_location_verified: verifyLocationDistance(jobLat, jobLng, checkInLat, checkInLng),
        check_out_location_verified: verifyLocationDistance(jobLat, jobLng, checkOutLat, checkOutLng),
      } as AttendanceWithRelations
    })

    const stats = calculateAttendanceStats(bookings)

    return {
      data: {
        job_id: jobId,
        job_title: jobTitle,
        records,
        stats,
      },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error fetching job attendance history:', error)
    return { data: null, error }
  }
}

/**
 * Get attendance history for a specific worker
 */
export async function getWorkerAttendanceHistory(
  workerId: string
): Promise<{ data: WorkerAttendanceHistory | null; error: any }> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        job:jobs!inner(
          id,
          title,
          address,
          lat,
          lng
        ),
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worker attendance history:', error)
      return { data: null, error }
    }

    if (!bookings || bookings.length === 0) {
      return {
        data: {
          worker_id: workerId,
          records: [],
          stats: {
            total_bookings: 0,
            checked_in_bookings: 0,
            checked_out_bookings: 0,
            attendance_rate: 0,
            on_time_arrivals: 0,
          },
        },
        error: null,
      }
    }

    const records = bookings.map((booking) => {
      const jobLat = booking.job?.lat ?? 0
      const jobLng = booking.job?.lng ?? 0
      const checkInLat = booking.check_in_lat ?? 0
      const checkInLng = booking.check_in_lng ?? 0
      const checkOutLat = booking.check_out_lat ?? 0
      const checkOutLng = booking.check_out_lng ?? 0

      return {
        ...booking,
        job: booking.job!,
        worker: booking.worker!,
        check_in_location_verified: verifyLocationDistance(jobLat, jobLng, checkInLat, checkInLng),
        check_out_location_verified: verifyLocationDistance(jobLat, jobLng, checkOutLat, checkOutLng),
      } as AttendanceWithRelations
    })

    const stats = calculateAttendanceStats(bookings)

    return {
      data: {
        worker_id: workerId,
        records,
        stats,
      },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error fetching worker attendance history:', error)
    return { data: null, error }
  }
}

/**
 * Verify if a worker's GPS location is within acceptable range of the job location
 * Uses Haversine formula to calculate distance between coordinates
 */
export async function verifyWorkerLocation(
  jobId: string,
  workerLat: number,
  workerLng: number
): Promise<LocationVerificationResult> {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('lat, lng')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('Error verifying worker location:', error)
      return {
        is_verified: false,
        distance: 0,
        status: 'unverified',
      }
    }

    if (!job) {
      return {
        is_verified: false,
        distance: 0,
        status: 'unverified',
      }
    }

    return calculateLocationVerification(job.lat, job.lng, workerLat, workerLng)
  } catch (error) {
    console.error('Unexpected error verifying worker location:', error)
    return {
      is_verified: false,
      distance: 0,
      status: 'unverified',
    }
  }
}

/**
 * Calculate attendance rate for a worker
 * Returns percentage of bookings where worker checked in
 */
export async function calculateAttendanceRate(
  workerId: string
): Promise<{ data: number | null; error: any }> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, check_in_at')
      .eq('worker_id', workerId)

    if (error) {
      console.error('Error calculating attendance rate:', error)
      return { data: null, error }
    }

    if (!bookings || bookings.length === 0) {
      return { data: 0, error: null }
    }

    const totalBookings = bookings.length
    const checkedInBookings = bookings.filter((b) => b.check_in_at !== null).length
    const attendanceRate = (checkedInBookings / totalBookings) * 100

    return { data: attendanceRate, error: null }
  } catch (error) {
    console.error('Unexpected error calculating attendance rate:', error)
    return { data: null, error }
  }
}

/**
 * Get attendance records with pagination and filtering
 */
export async function getAttendanceList(
  params: {
    worker_id?: string
    job_id?: string
    business_id?: string
    start_date?: string
    end_date?: string
    page?: number
    limit?: number
  } = {}
): Promise<{ data: AttendanceListResponse | null; error: any }> {
  try {
    const page = params.page || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('bookings')
      .select(`
        *,
        job:jobs!inner(
          id,
          title,
          address,
          lat,
          lng
        ),
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        )
      `, { count: 'exact' })

    if (params.worker_id) {
      query = query.eq('worker_id', params.worker_id)
    }
    if (params.job_id) {
      query = query.eq('job_id', params.job_id)
    }
    if (params.business_id) {
      query = query.eq('business_id', params.business_id)
    }
    if (params.start_date) {
      query = query.gte('created_at', params.start_date)
    }
    if (params.end_date) {
      query = query.lte('created_at', params.end_date)
    }

    const { data: bookings, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching attendance list:', error)
      return { data: null, error }
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    const records = (bookings || []).map((booking) => {
      const jobLat = booking.job?.lat ?? 0
      const jobLng = booking.job?.lng ?? 0
      const checkInLat = booking.check_in_lat ?? 0
      const checkInLng = booking.check_in_lng ?? 0
      const checkOutLat = booking.check_out_lat ?? 0
      const checkOutLng = booking.check_out_lng ?? 0

      return {
        ...booking,
        job: booking.job!,
        worker: booking.worker!,
        check_in_location_verified: verifyLocationDistance(jobLat, jobLng, checkInLat, checkInLng),
        check_out_location_verified: verifyLocationDistance(jobLat, jobLng, checkOutLat, checkOutLng),
      } as AttendanceWithRelations
    })

    return {
      data: {
        records,
        total,
        page,
        limit,
        totalPages,
      },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error fetching attendance list:', error)
    return { data: null, error }
  }
}

/**
 * Get attendance stats for a worker
 */
export async function getWorkerAttendanceStats(
  workerId: string
): Promise<{ data: AttendanceStats | null; error: any }> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, check_in_at, check_out_at, start_date')
      .eq('worker_id', workerId)

    if (error) {
      console.error('Error fetching worker attendance stats:', error)
      return { data: null, error }
    }

    const stats = calculateAttendanceStats(bookings || [])

    return { data: stats, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker attendance stats:', error)
    return { data: null, error }
  }
}

// Helper functions

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Calculate location verification result
 */
function calculateLocationVerification(
  jobLat: number,
  jobLng: number,
  workerLat: number,
  workerLng: number,
  maxDistance: number = 100 // 100 meters default
): LocationVerificationResult {
  // If no coordinates provided, consider unverified
  if (workerLat === 0 && workerLng === 0) {
    return {
      is_verified: false,
      distance: 0,
      status: 'unverified',
    }
  }

  const distance = haversineDistance(jobLat, jobLng, workerLat, workerLng)
  const isVerified = distance <= maxDistance

  return {
    is_verified: isVerified,
    distance: Math.round(distance),
    status: isVerified ? 'verified' : 'out_of_range',
  }
}

/**
 * Verify location distance for attendance record
 */
function verifyLocationDistance(
  jobLat: number,
  jobLng: number,
  checkLat: number,
  checkLng: number
): 'verified' | 'unverified' | 'out_of_range' {
  // If no coordinates provided, consider unverified
  if (checkLat === 0 && checkLng === 0) {
    return 'unverified'
  }

  const distance = haversineDistance(jobLat, jobLng, checkLat, checkLng)
  const maxDistance = 100 // 100 meters

  if (distance <= maxDistance) {
    return 'verified'
  }
  return 'out_of_range'
}

/**
 * Calculate attendance statistics from bookings
 */
function calculateAttendanceStats(bookings: Array<{
  check_in_at: string | null
  check_out_at: string | null
  start_date: string
}>): AttendanceStats {
  const totalBookings = bookings.length
  const checkedInBookings = bookings.filter((b) => b.check_in_at !== null)
  const checkedOutBookings = bookings.filter((b) => b.check_out_at !== null)

  const attendanceRate =
    totalBookings > 0 ? (checkedInBookings.length / totalBookings) * 100 : 0

  // Calculate on-time arrivals (checked in within 15 minutes of start time)
  const onTimeArrivals = checkedInBookings.filter((booking) => {
    if (!booking.check_in_at || !booking.start_date) {
      return false
    }
    const checkInTime = new Date(booking.check_in_at)
    const startTime = new Date(booking.start_date)
    const diffMinutes = (checkInTime.getTime() - startTime.getTime()) / (1000 * 60)
    // Consider on-time if checked in within 15 minutes before to 15 minutes after start
    return diffMinutes >= -15 && diffMinutes <= 15
  }).length

  return {
    total_bookings: totalBookings,
    checked_in_bookings: checkedInBookings.length,
    checked_out_bookings: checkedOutBookings.length,
    attendance_rate: Math.round(attendanceRate),
    on_time_arrivals: onTimeArrivals,
  }
}

/**
 * Create notification for worker check-in
 */
async function createCheckInNotification(bookingId: string) {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        job:jobs!inner(id, title),
        worker:workers!inner(id, full_name)
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', booking.business_id)
      .single()

    if (!business) {
      return
    }

    await supabase.from('notifications').insert({
      user_id: business.user_id,
      title: 'Pekerja telah check-in',
      body: `${booking.worker.full_name} telah check-in untuk pekerjaan ${booking.job.title}`,
      link: `/bookings/${bookingId}`,
      is_read: false,
    })
  } catch {
  }
}

/**
 * Create notification for worker check-out
 */
async function createCheckOutNotification(bookingId: string) {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        job:jobs!inner(id, title),
        worker:workers!inner(id, full_name)
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', booking.business_id)
      .single()

    if (!business) {
      return
    }

    await supabase.from('notifications').insert({
      user_id: business.user_id,
      title: 'Pekerja telah check-out',
      body: `${booking.worker.full_name} telah menyelesaikan pekerjaan ${booking.job.title}`,
      link: `/bookings/${bookingId}`,
      is_read: false,
    })
  } catch {
  }
}

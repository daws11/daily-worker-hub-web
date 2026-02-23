import { supabase } from '../client'
import type { Database } from '../types'

// ============================================
// TYPES
// ============================================

type BookingRow = Database['public']['Tables']['bookings']['Row']
type JobRow = Database['public']['Tables']['jobs']['Row']
type WorkerRow = Database['public']['Tables']['workers']['Row']

export interface BusinessSpending {
  total_spending: number
  transaction_count: number
  average_spending_per_booking: number
}

export interface WorkerCountAnalytics {
  unique_workers: number
  total_bookings: number
  repeat_hire_rate: number
}

export interface PopularPosition {
  position_title: string
  count: number
  percentage: number
}

export interface ReliabilityScoreAnalytics {
  average_score: number
  worker_count: number
  distribution: {
    excellent: number    // 4.5 - 5.0
    good: number         // 3.5 - 4.4
    fair: number         // 2.5 - 3.4
    poor: number         // 1.0 - 2.4
  }
}

export interface MonthlyTrend {
  month: string
  year: number
  spending: number
  booking_count: number
  worker_count: number
}

export interface ComplianceStatus {
  compliant_jobs: number
  total_jobs: number
  compliance_rate: number
  issues: {
    missing_deadline: number
    missing_requirements: number
    cancelled_bookings: number
  }
}

export interface DateRange {
  start_date?: string
  end_date?: string
}

// ============================================
// BUSINESS SPENDING
// ============================================

/**
 * Get total spending for a business across all bookings
 * @param businessId - The business ID
 * @param dateRange - Optional date range filter
 * @returns Business spending metrics
 */
export async function getBusinessSpending(
  businessId: string,
  dateRange?: DateRange
) {
  try {
    let query = supabase
      .from('bookings')
      .select('final_price, created_at')
      .eq('business_id', businessId)
      .in('status', ['completed', 'in_progress', 'accepted'])

    if (dateRange?.start_date) {
      query = query.gte('created_at', dateRange.start_date)
    }

    if (dateRange?.end_date) {
      query = query.lte('created_at', dateRange.end_date)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching business spending:', error)
      return { data: null, error }
    }

    const bookings = data || []
    const totalSpending = bookings.reduce((sum, b) => sum + (b.final_price || 0), 0)
    const transactionCount = bookings.length
    const averageSpending = transactionCount > 0 ? totalSpending / transactionCount : 0

    const result: BusinessSpending = {
      total_spending: totalSpending,
      transaction_count: transactionCount,
      average_spending_per_booking: Math.round(averageSpending * 100) / 100
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business spending:', error)
    return { data: null, error }
  }
}

// ============================================
// UNIQUE WORKER COUNT
// ============================================

/**
 * Get unique worker count for a business
 * @param businessId - The business ID
 * @param dateRange - Optional date range filter
 * @returns Worker count analytics
 */
export async function getUniqueWorkerCount(
  businessId: string,
  dateRange?: DateRange
) {
  try {
    let query = supabase
      .from('bookings')
      .select('worker_id')
      .eq('business_id', businessId)

    if (dateRange?.start_date) {
      query = query.gte('created_at', dateRange.start_date)
    }

    if (dateRange?.end_date) {
      query = query.lte('created_at', dateRange.end_date)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching unique worker count:', error)
      return { data: null, error }
    }

    const bookings = data || []
    const uniqueWorkers = new Set(bookings.map(b => b.worker_id))
    const totalBookings = bookings.length

    // Calculate repeat hire rate (bookings beyond first hire per worker)
    const repeatHires = totalBookings - uniqueWorkers.size
    const repeatHireRate = totalBookings > 0 ? (repeatHires / totalBookings) * 100 : 0

    const result: WorkerCountAnalytics = {
      unique_workers: uniqueWorkers.size,
      total_bookings: totalBookings,
      repeat_hire_rate: Math.round(repeatHireRate * 10) / 10
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching unique worker count:', error)
    return { data: null, error }
  }
}

// ============================================
// POPULAR POSITIONS
// ============================================

/**
 * Get most popular job positions hired by a business
 * @param businessId - The business ID
 * @param dateRange - Optional date range filter
 * @param limit - Maximum number of positions to return (default: 10)
 * @returns Array of popular positions
 */
export async function getPopularPositions(
  businessId: string,
  dateRange?: DateRange,
  limit = 10
) {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        job_id,
        jobs!inner(
          title
        )
      `)
      .eq('business_id', businessId)

    if (dateRange?.start_date) {
      query = query.gte('created_at', dateRange.start_date)
    }

    if (dateRange?.end_date) {
      query = query.lte('created_at', dateRange.end_date)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching popular positions:', error)
      return { data: null, error }
    }

    // Count occurrences of each position
    const positionCounts = new Map<string, number>()
    let totalCount = 0

    for (const booking of data || []) {
      const job = booking.jobs as any
      if (job?.title) {
        const count = positionCounts.get(job.title) || 0
        positionCounts.set(job.title, count + 1)
        totalCount++
      }
    }

    // Convert to array and sort by count
    const positions: PopularPosition[] = Array.from(positionCounts.entries())
      .map(([title, count]) => ({
        position_title: title,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return { data: positions, error: null }
  } catch (error) {
    console.error('Unexpected error fetching popular positions:', error)
    return { data: null, error }
  }
}

// ============================================
// AVERAGE RELIABILITY SCORE
// ============================================

/**
 * Get average reliability score for workers hired by a business
 * Uses the calculateReliabilityScore function from bookings.ts
 * @param businessId - The business ID
 * @param dateRange - Optional date range filter
 * @returns Reliability score analytics
 */
export async function getAverageReliabilityScore(
  businessId: string,
  dateRange?: DateRange
) {
  try {
    // First get all unique workers hired by this business
    let workerQuery = supabase
      .from('bookings')
      .select('worker_id')
      .eq('business_id', businessId)

    if (dateRange?.start_date) {
      workerQuery = workerQuery.gte('created_at', dateRange.start_date)
    }

    if (dateRange?.end_date) {
      workerQuery = workerQuery.lte('created_at', dateRange.end_date)
    }

    const { data: workerData, error: workerError } = await workerQuery

    if (workerError) {
      console.error('Error fetching workers for reliability score:', workerError)
      return { data: null, error: workerError }
    }

    const uniqueWorkerIds = Array.from(new Set(workerData?.map(b => b.worker_id) || []))

    // Get reliability metrics for each worker
    let totalScore = 0
    let workerCount = 0
    const scores: number[] = []

    for (const workerId of uniqueWorkerIds) {
      // Get all bookings for this worker (across all businesses for accurate reliability)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('worker_id', workerId)

      if (!bookingsError && bookings) {
        // Calculate reliability score
        const completedBookings = bookings.filter(b => b.status === 'completed')
        const totalBookings = bookings.length

        if (totalBookings > 0) {
          // Attendance score (40%)
          const attendanceRate = completedBookings.length / totalBookings
          const attendanceScore = attendanceRate * 5.0

          // Rating score (30%) - fetch from reviews table
          const completedBookingIds = completedBookings.map(b => b.id)
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .in('booking_id', completedBookingIds)

          const ratings = reviews?.map(r => r.rating) || []
          const avgRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 4.0
          const ratingScore = avgRating

          // Punctuality score (30%) - assuming all completed bookings were punctual
          const punctualityScore = 4.0

          const weightedScore = (
            (attendanceScore * 0.40) +
            (ratingScore * 0.30) +
            (punctualityScore * 0.30)
          )

          const finalScore = Math.max(1.0, Math.min(5.0, weightedScore))
          totalScore += finalScore
          scores.push(finalScore)
          workerCount++
        }
      }
    }

    // Calculate distribution
    const distribution = {
      excellent: scores.filter(s => s >= 4.5).length,
      good: scores.filter(s => s >= 3.5 && s < 4.5).length,
      fair: scores.filter(s => s >= 2.5 && s < 3.5).length,
      poor: scores.filter(s => s < 2.5).length
    }

    const result: ReliabilityScoreAnalytics = {
      average_score: workerCount > 0 ? Math.round((totalScore / workerCount) * 100) / 100 : 0,
      worker_count: workerCount,
      distribution
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching average reliability score:', error)
    return { data: null, error }
  }
}

// ============================================
// SEASONAL TRENDS
// ============================================

/**
 * Get seasonal hiring and spending trends for a business
 * @param businessId - The business ID
 * @param dateRange - Optional date range filter
 * @returns Array of monthly trends
 */
export async function getSeasonalTrends(
  businessId: string,
  dateRange?: DateRange
) {
  try {
    let query = supabase
      .from('bookings')
      .select('final_price, created_at, worker_id')
      .eq('business_id', businessId)
      .in('status', ['completed', 'in_progress', 'accepted'])
      .order('created_at', { ascending: true })

    if (dateRange?.start_date) {
      query = query.gte('created_at', dateRange.start_date)
    }

    if (dateRange?.end_date) {
      query = query.lte('created_at', dateRange.end_date)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching seasonal trends:', error)
      return { data: null, error }
    }

    // Group by month
    const monthlyData = new Map<string, {
      spending: number
      booking_count: number
      workers: Set<string>
    }>()

    for (const booking of data || []) {
      const date = new Date(booking.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          spending: 0,
          booking_count: 0,
          workers: new Set()
        })
      }

      const monthData = monthlyData.get(monthKey)!
      monthData.spending += booking.final_price || 0
      monthData.booking_count += 1
      monthData.workers.add(booking.worker_id)
    }

    // Convert to array format
    const trends: MonthlyTrend[] = Array.from(monthlyData.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-')
        return {
          month: `${year}-${month}`,
          year: parseInt(year, 10),
          spending: data.spending,
          booking_count: data.booking_count,
          worker_count: data.workers.size
        }
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month.localeCompare(b.month)
      })

    return { data: trends, error: null }
  } catch (error) {
    console.error('Unexpected error fetching seasonal trends:', error)
    return { data: null, error }
  }
}

// ============================================
// COMPLIANCE STATUS
// ============================================

/**
 * Get compliance status metrics for a business (PP 35/2021 adherence)
 * @param businessId - The business ID
 * @param dateRange - Optional date range filter
 * @returns Compliance status metrics
 */
export async function getComplianceStatus(
  businessId: string,
  dateRange?: DateRange
) {
  try {
    // Get all jobs for the business
    let jobQuery = supabase
      .from('jobs')
      .select('id, deadline, requirements, status')
      .eq('business_id', businessId)

    if (dateRange?.start_date) {
      jobQuery = jobQuery.gte('created_at', dateRange.start_date)
    }

    if (dateRange?.end_date) {
      jobQuery = jobQuery.lte('created_at', dateRange.end_date)
    }

    const { data: jobs, error: jobError } = await jobQuery

    if (jobError) {
      console.error('Error fetching jobs for compliance status:', jobError)
      return { data: null, error: jobError }
    }

    // Get bookings for cancelled count
    let bookingQuery = supabase
      .from('bookings')
      .select('id, status')
      .eq('business_id', businessId)

    if (dateRange?.start_date) {
      bookingQuery = bookingQuery.gte('created_at', dateRange.start_date)
    }

    if (dateRange?.end_date) {
      bookingQuery = bookingQuery.lte('created_at', dateRange.end_date)
    }

    const { data: bookings, error: bookingError } = await bookingQuery

    if (bookingError) {
      console.error('Error fetching bookings for compliance status:', bookingError)
      return { data: null, error: bookingError }
    }

    // Analyze compliance
    let missingDeadline = 0
    let missingRequirements = 0

    for (const job of jobs || []) {
      if (!job.deadline) {
        missingDeadline++
      }
      if (!job.requirements || job.requirements.trim() === '') {
        missingRequirements++
      }
    }

    const totalJobs = jobs?.length || 0
    const compliantJobs = totalJobs - missingDeadline - missingRequirements
    const complianceRate = totalJobs > 0 ? Math.round((compliantJobs / totalJobs) * 100) : 100

    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0

    const result: ComplianceStatus = {
      compliant_jobs: Math.max(0, compliantJobs),
      total_jobs: totalJobs,
      compliance_rate: complianceRate,
      issues: {
        missing_deadline: missingDeadline,
        missing_requirements: missingRequirements,
        cancelled_bookings: cancelledBookings
      }
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching compliance status:', error)
    return { data: null, error }
  }
}

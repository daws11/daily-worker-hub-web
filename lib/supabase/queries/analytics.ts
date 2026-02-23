import { supabase } from '../client'
import type { Database } from '../types'
import type {
  PlatformMetrics,
  ChartDataPoint,
  UserGrowthData,
  JobActivityData,
  RevenueData,
  AreaStats,
  AnalyticsTimeRange,
} from '../../types/admin'

type UsersRow = Database['public']['Tables']['users']['Row']
type JobsRow = Database['public']['Tables']['jobs']['Row']
type BookingsRow = Database['public']['Tables']['bookings']['Row']
type TransactionsRow = Database['public']['Tables']['transactions']['Row']
type BusinessesRow = Database['public']['Tables']['businesses']['Row']
type KYCVerificationsRow = Database['public']['Tables']['kyc_verifications']['Row']
type ReportsRow = Database['public']['Tables']['reports']['Row']

/**
 * Get platform metrics summary
 * Returns aggregated statistics across all platform entities
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Execute all queries in parallel for better performance
  const [
    usersResult,
    jobsResult,
    bookingsResult,
    transactionsResult,
    businessesResult,
    kycResult,
    reportsResult,
  ] = await Promise.all([
    // User metrics
    supabase.from('users').select('id, role, created_at'),
    // Job metrics
    supabase.from('jobs').select('id, status, created_at'),
    // Booking metrics
    supabase.from('bookings').select('id, status, created_at'),
    // Transaction metrics
    supabase.from('transactions').select('id, amount, status, created_at'),
    // Business verification metrics
    supabase.from('businesses').select('id, verification_status, created_at'),
    // KYC verification metrics
    supabase.from('kyc_verifications').select('id, status, submitted_at, verified_at'),
    // Reports metrics
    supabase.from('reports').select('id, status, created_at'),
  ])

  // Check for errors
  if (usersResult.error) throw new Error(`Failed to fetch user metrics: ${usersResult.error.message}`)
  if (jobsResult.error) throw new Error(`Failed to fetch job metrics: ${jobsResult.error.message}`)
  if (bookingsResult.error) throw new Error(`Failed to fetch booking metrics: ${bookingsResult.error.message}`)
  if (transactionsResult.error) throw new Error(`Failed to fetch transaction metrics: ${transactionsResult.error.message}`)
  if (businessesResult.error) throw new Error(`Failed to fetch business metrics: ${businessesResult.error.message}`)
  if (kycResult.error) throw new Error(`Failed to fetch KYC metrics: ${kycResult.error.message}`)
  if (reportsResult.error) throw new Error(`Failed to fetch report metrics: ${reportsResult.error.message}`)

  const users = (usersResult.data || []) as any[]
  const jobs = (jobsResult.data || []) as any[]
  const bookings = (bookingsResult.data || []) as any[]
  const transactions = (transactionsResult.data || []) as any[]
  const businesses = (businessesResult.data || []) as any[]
  const kycVerifications = (kycResult.data || []) as any[]
  const reportsData = (reportsResult.data || []) as any[]

  // Calculate user metrics
  const workers = users.filter(u => u.role === 'worker').length
  const businessesCount = users.filter(u => u.role === 'business').length
  const admins = users.filter(u => u.role === 'admin').length
  const newUsersThisWeek = users.filter(u => u.created_at >= weekAgo).length
  const newUsersThisMonth = users.filter(u => u.created_at >= monthAgo).length

  // Calculate job metrics
  const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'in_progress').length
  const completedJobs = jobs.filter(j => j.status === 'completed').length
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled').length
  const newJobsThisWeek = jobs.filter(j => j.created_at >= weekAgo).length
  const newJobsThisMonth = jobs.filter(j => j.created_at >= monthAgo).length

  // Calculate booking metrics
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const inProgressBookings = bookings.filter(b => b.status === 'in_progress').length
  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
  const newBookingsThisWeek = bookings.filter(b => b.created_at >= weekAgo).length
  const newBookingsThisMonth = bookings.filter(b => b.created_at >= monthAgo).length

  // Calculate transaction metrics
  const successfulTransactions = transactions.filter(t => t.status === 'success')
  const pendingTransactions = transactions.filter(t => t.status === 'pending')
  const totalVolume = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  const pendingVolume = pendingTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  const completedVolume = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
  const thisWeekVolume = successfulTransactions
    .filter(t => t.created_at >= weekAgo)
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const thisMonthVolume = successfulTransactions
    .filter(t => t.created_at >= monthAgo)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  // Calculate verification metrics
  const pendingBusiness = businesses.filter(b => b.verification_status === 'pending').length
  const pendingKYC = kycVerifications.filter(k => k.status === 'pending').length
  const approvedThisWeek = kycVerifications.filter(
    k => k.status === 'verified' && k.verified_at && k.verified_at >= weekAgo
  ).length
  const rejectedThisWeek = kycVerifications.filter(
    k => k.status === 'rejected' && k.verified_at && k.verified_at >= weekAgo
  ).length

  // Calculate dispute metrics (using reports as proxy)
  const openDisputes = reportsData.filter(r => r.status === 'pending' || r.status === 'reviewing').length
  const resolvedReports = reportsData.filter(r => r.status === 'resolved')
  const resolvedThisWeek = resolvedReports.filter(r => r.created_at >= weekAgo).length
  const resolvedThisMonth = resolvedReports.filter(r => r.created_at >= monthAgo).length

  // Calculate report metrics
  const pendingReports = reportsData.filter(r => r.status === 'pending').length
  const openReports = reportsData.filter(r => r.status === 'pending' || r.status === 'reviewing').length
  const reportsResolvedThisWeek = resolvedReports.filter(r => r.created_at >= weekAgo).length

  return {
    users: {
      total: users.length,
      workers,
      businesses: businessesCount,
      admins,
      newThisWeek: newUsersThisWeek,
      newThisMonth: newUsersThisMonth,
    },
    jobs: {
      total: jobs.length,
      active: activeJobs,
      completed: completedJobs,
      cancelled: cancelledJobs,
      newThisWeek: newJobsThisWeek,
      newThisMonth: newJobsThisMonth,
    },
    bookings: {
      total: bookings.length,
      pending: pendingBookings,
      inProgress: inProgressBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      newThisWeek: newBookingsThisWeek,
      newThisMonth: newBookingsThisMonth,
    },
    transactions: {
      total: transactions.length,
      totalVolume,
      pendingVolume,
      completedVolume,
      thisWeekVolume,
      thisMonthVolume,
    },
    verifications: {
      pendingBusiness,
      pendingKYC,
      approvedThisWeek,
      rejectedThisWeek,
    },
    disputes: {
      open: openDisputes,
      resolvedThisWeek: resolvedThisWeek,
      resolvedThisMonth: resolvedThisMonth,
      avgResolutionTime: 0, // Would need additional data for accurate calculation
    },
    reports: {
      pending: pendingReports,
      open: openReports,
      resolvedThisWeek: reportsResolvedThisWeek,
    },
  }
}

/**
 * Get user growth data over time
 * Groups user registrations by date
 */
export async function getUserGrowthData(
  timeRange: AnalyticsTimeRange
): Promise<UserGrowthData[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, created_at')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch user growth data: ${error.message}`)
  }

  // Group by date
  const groupedData = new Map<string, UserGrowthData>()
  const users = (data || []) as any[]

  // Initialize dates in range
  const startDate = new Date(timeRange.start)
  const endDate = new Date(timeRange.end)
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0]
    groupedData.set(dateKey, {
      date: dateKey,
      value: 0,
      workers: 0,
      businesses: 0,
      total: 0,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Count users by date and role
  let cumulativeWorkers = 0
  let cumulativeBusinesses = 0

  for (const user of users) {
    const dateKey = user.created_at.split('T')[0]
    const existing = groupedData.get(dateKey) || {
      date: dateKey,
      value: 0,
      workers: 0,
      businesses: 0,
      total: 0,
    }

    if (user.role === 'worker') {
      cumulativeWorkers++
    } else if (user.role === 'business') {
      cumulativeBusinesses++
    }

    const total = cumulativeWorkers + cumulativeBusinesses
    groupedData.set(dateKey, {
      date: dateKey,
      value: total,
      workers: cumulativeWorkers,
      businesses: cumulativeBusinesses,
      total,
    })
  }

  return Array.from(groupedData.values())
}

/**
 * Get job activity data over time
 * Groups job postings and completions by date
 */
export async function getJobActivityData(
  timeRange: AnalyticsTimeRange
): Promise<JobActivityData[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, created_at, updated_at')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch job activity data: ${error.message}`)
  }

  // Group by date
  const groupedData = new Map<string, JobActivityData>()
  const jobs = (data || []) as any[]

  // Initialize dates in range
  const startDate = new Date(timeRange.start)
  const endDate = new Date(timeRange.end)
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0]
    groupedData.set(dateKey, {
      date: dateKey,
      value: 0,
      posted: 0,
      completed: 0,
      cancelled: 0,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Count jobs by date and status
  for (const job of jobs) {
    const dateKey = job.created_at.split('T')[0]
    const existing = groupedData.get(dateKey)

    if (existing) {
      existing.posted++
      existing.value = existing.posted + existing.completed + existing.cancelled
    }

    // Track completions and cancellations by updated_at
    if (job.status === 'completed' || job.status === 'cancelled') {
      const updatedDateKey = job.updated_at.split('T')[0]
      const updatedExisting = groupedData.get(updatedDateKey)

      if (updatedExisting) {
        if (job.status === 'completed') {
          updatedExisting.completed++
        } else if (job.status === 'cancelled') {
          updatedExisting.cancelled++
        }
        updatedExisting.value = updatedExisting.posted + updatedExisting.completed + updatedExisting.cancelled
      }
    }
  }

  return Array.from(groupedData.values())
}

/**
 * Get revenue data over time
 * Groups successful transactions by date
 */
export async function getRevenueData(
  timeRange: AnalyticsTimeRange
): Promise<RevenueData[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, status, created_at')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end)
    .eq('status', 'success')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch revenue data: ${error.message}`)
  }

  // Group by date
  const groupedData = new Map<string, RevenueData>()
  const transactions = (data || []) as any[]

  // Initialize dates in range
  const startDate = new Date(timeRange.start)
  const endDate = new Date(timeRange.end)
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0]
    groupedData.set(dateKey, {
      date: dateKey,
      value: 0,
      total: 0,
      fees: 0,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Sum revenue by date
  const platformFeeRate = 0.05 // 5% platform fee

  for (const transaction of transactions) {
    const dateKey = transaction.created_at.split('T')[0]
    const existing = groupedData.get(dateKey)

    if (existing) {
      existing.total += transaction.amount || 0
      existing.fees += (transaction.amount || 0) * platformFeeRate
      existing.value = existing.total
    }
  }

  return Array.from(groupedData.values())
}

/**
 * Get statistics by area
 * Returns aggregated metrics for each area in Bali
 */
export async function getAreaStats(): Promise<AreaStats[]> {
  const areas = ['Badung', 'Denpasar', 'Gianyar', 'Tabanan', 'Buleleng', 'Klungkung', 'Karangasem', 'Bangli', 'Jembrana']

  const [usersResult, businessesResult, jobsResult, bookingsResult, transactionsResult] = await Promise.all([
    supabase.from('users').select('id, role').not('role', 'eq', 'admin'),
    supabase.from('businesses').select('id, area'),
    supabase.from('jobs').select('id, lat, lng'),
    supabase.from('bookings').select('id, lat, lng'),
    supabase.from('transactions').select('id, amount, status').eq('status', 'success'),
  ])

  if (usersResult.error) throw new Error(`Failed to fetch users: ${usersResult.error.message}`)
  if (businessesResult.error) throw new Error(`Failed to fetch businesses: ${businessesResult.error.message}`)
  if (jobsResult.error) throw new Error(`Failed to fetch jobs: ${jobsResult.error.message}`)
  if (bookingsResult.error) throw new Error(`Failed to fetch bookings: ${bookingsResult.error.message}`)
  if (transactionsResult.error) throw new Error(`Failed to fetch transactions: ${transactionsResult.error.message}`)

  const users = (usersResult.data || []) as any[]
  const businesses = (businessesResult.data || []) as any[]
  const jobs = (jobsResult.data || []) as any[]
  const bookings = (bookingsResult.data || []) as any[]
  const transactions = (transactionsResult.data || []) as any[]

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)

  // Calculate stats per area
  const areaStats: AreaStats[] = areas.map(area => {
    const businessesInArea = businesses.filter(b => b.area === area)
    const jobsInArea = jobs.filter(j => isInArea(j.lat, j.lng, area))
    const bookingsInArea = bookings.filter(b => isInArea(b.lat, b.lng, area))

    // Estimate revenue by area based on booking distribution
    const revenueShare = bookingsInArea.length / Math.max(bookings.length, 1)
    const areaRevenue = totalRevenue * revenueShare

    return {
      area,
      users: businessesInArea.length, // Using business count as proxy for users
      jobs: jobsInArea.length,
      bookings: bookingsInArea.length,
      revenue: areaRevenue,
    }
  })

  return areaStats
}

/**
 * Helper function to determine if coordinates are within an area
 * This is a simplified implementation - in production you'd use proper geolocation
 */
function isInArea(lat: number, lng: number, area: string): boolean {
  // Bali coordinates by area (simplified bounding boxes)
  const areaBounds: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
    Badung: { minLat: -8.8, maxLat: -8.5, minLng: 115.0, maxLng: 115.3 },
    Denpasar: { minLat: -8.7, maxLat: -8.6, minLng: 115.2, maxLng: 115.25 },
    Gianyar: { minLat: -8.7, maxLat: -8.4, minLng: 115.2, maxLng: 115.5 },
    Tabanan: { minLat: -8.6, maxLat: -8.3, minLng: 114.9, maxLng: 115.2 },
    Buleleng: { minLat: -8.2, maxLat: -8.0, minLng: 115.0, maxLng: 115.6 },
    Klungkung: { minLat: -8.6, maxLat: -8.4, minLng: 115.4, maxLng: 115.6 },
    Karangasem: { minLat: -8.6, maxLat: -8.3, minLng: 115.4, maxLng: 115.8 },
    Bangli: { minLat: -8.5, maxLat: -8.2, minLng: 115.3, maxLng: 115.5 },
    Jembrana: { minLat: -8.5, maxLat: -8.2, minLng: 114.6, maxLng: 114.9 },
  }

  const bounds = areaBounds[area]
  if (!bounds) return false

  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  )
}

/**
 * Get chart data for various metrics
 * Generic function to fetch time-series data for any metric type
 */
export async function getChartData(
  metric: 'users' | 'jobs' | 'bookings' | 'revenue',
  timeRange: AnalyticsTimeRange
): Promise<ChartDataPoint[]> {
  switch (metric) {
    case 'users':
      return getUserGrowthData(timeRange)
    case 'jobs':
      return getJobActivityData(timeRange)
    case 'bookings':
      return getBookingActivityData(timeRange)
    case 'revenue':
      return getRevenueData(timeRange)
    default:
      return []
  }
}

/**
 * Get booking activity data over time
 * Groups bookings by date and status
 */
async function getBookingActivityData(
  timeRange: AnalyticsTimeRange
): Promise<ChartDataPoint[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, created_at')
    .gte('created_at', timeRange.start)
    .lte('created_at', timeRange.end)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch booking activity data: ${error.message}`)
  }

  // Group by date
  const groupedData = new Map<string, ChartDataPoint>()
  const bookings = (data || []) as any[]

  // Initialize dates in range
  const startDate = new Date(timeRange.start)
  const endDate = new Date(timeRange.end)
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0]
    groupedData.set(dateKey, {
      date: dateKey,
      value: 0,
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Count bookings by date
  for (const booking of bookings) {
    const dateKey = booking.created_at.split('T')[0]
    const existing = groupedData.get(dateKey)

    if (existing) {
      existing.value++
    }
  }

  return Array.from(groupedData.values())
}

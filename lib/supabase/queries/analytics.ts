// @ts-nocheck
import { supabase } from '../client'
import type {
  UserGrowthMetrics,
  JobCompletionMetrics,
  TransactionVolumeMetrics,
  GeographicDistribution,
  TrendingCategory,
  ComplianceMetrics,
  RevenueMetrics,
  BookingMetrics,
  DailyActiveUsers,
  MonthlyActiveUsers,
  UserGrowthQueryParams,
  JobCompletionQueryParams,
  TransactionVolumeQueryParams,
  ComplianceQueryParams,
  RevenueQueryParams,
  BookingSummaryQueryParams,
} from '../../types/analytics'

// ============================================================================
// USER GROWTH ANALYTICS
// ============================================================================

/**
 * Get user growth metrics over time
 * @param params - Optional start and end date filters
 * @returns Array of user growth metrics by date
 */
export async function getUserGrowthMetrics(
  params: UserGrowthQueryParams = {}
): Promise<UserGrowthMetrics[]> {
  const { start_date, end_date } = params

  const { data, error } = await (supabase as any)
    .rpc('get_analytics_user_growth', {
      start_date: start_date || null,
      end_date: end_date || null,
    })

  if (error) {
    throw new Error(`Failed to fetch user growth metrics: ${error.message}`)
  }

  return data || []
}

/**
 * Get daily active users (DAU) metrics
 * @returns Array of daily active users by date
 */
export async function getDailyActiveUsers(): Promise<DailyActiveUsers[]> {
  const { data, error } = await (supabase as any)
    .from('analytics_daily_active_users')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch daily active users: ${error.message}`)
  }

  return data || []
}

/**
 * Get monthly active users (MAU) metrics
 * @returns Array of monthly active users by month
 */
export async function getMonthlyActiveUsers(): Promise<MonthlyActiveUsers[]> {
  const { data, error } = await (supabase as any)
    .from('analytics_monthly_active_users')
    .select('*')
    .order('month', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch monthly active users: ${error.message}`)
  }

  return data || []
}

/**
 * Refresh the daily active users materialized view
 * This should be called periodically to keep DAU data up to date
 */
export async function refreshDailyActiveUsers(): Promise<void> {
  const { error } = await (supabase as any).rpc('refresh_analytics_daily_active_users')

  if (error) {
    throw new Error(`Failed to refresh daily active users: ${error.message}`)
  }
}

/**
 * Refresh the monthly active users materialized view
 * This should be called periodically to keep MAU data up to date
 */
export async function refreshMonthlyActiveUsers(): Promise<void> {
  const { error } = await (supabase as any).rpc('refresh_analytics_monthly_active_users')

  if (error) {
    throw new Error(`Failed to refresh monthly active users: ${error.message}`)
  }
}

// ============================================================================
// JOB COMPLETION ANALYTICS
// ============================================================================

/**
 * Get job completion metrics over time
 * @param params - Optional start and end date filters
 * @returns Array of job completion metrics by date
 */
export async function getJobCompletionMetrics(
  params: JobCompletionQueryParams = {}
): Promise<JobCompletionMetrics[]> {
  const { start_date, end_date } = params

  const { data, error } = await (supabase as any)
    .rpc('get_analytics_job_completion', {
      start_date: start_date || null,
      end_date: end_date || null,
    })

  if (error) {
    throw new Error(`Failed to fetch job completion metrics: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// TRANSACTION VOLUME ANALYTICS
// ============================================================================

/**
 * Get transaction volume metrics over time
 * @param params - Optional start and end date filters
 * @returns Array of transaction volume metrics by date
 */
export async function getTransactionVolumeMetrics(
  params: TransactionVolumeQueryParams = {}
): Promise<TransactionVolumeMetrics[]> {
  const { start_date, end_date } = params

  const { data, error } = await (supabase as any)
    .rpc('get_analytics_transaction_volume', {
      start_date: start_date || null,
      end_date: end_date || null,
    })

  if (error) {
    throw new Error(`Failed to fetch transaction volume metrics: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// GEOGRAPHIC DISTRIBUTION ANALYTICS
// ============================================================================

/**
 * Get geographic distribution of workers and jobs
 * @returns Array of geographic distribution data by location
 */
export async function getGeographicDistribution(): Promise<GeographicDistribution[]> {
  const { data, error } = await (supabase as any)
    .rpc('get_analytics_geographic_distribution')

  if (error) {
    throw new Error(`Failed to fetch geographic distribution: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// TRENDING CATEGORIES ANALYTICS
// ============================================================================

/**
 * Get trending job categories by demand
 * @returns Array of trending categories sorted by booking count
 */
export async function getTrendingCategories(): Promise<TrendingCategory[]> {
  const { data, error } = await (supabase as any)
    .rpc('get_analytics_trending_categories')

  if (error) {
    throw new Error(`Failed to fetch trending categories: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// COMPLIANCE VIOLATIONS ANALYTICS
// ============================================================================

/**
 * Get compliance/KYC verification metrics over time
 * @param params - Optional start and end date filters
 * @returns Array of compliance metrics by date
 */
export async function getComplianceMetrics(
  params: ComplianceQueryParams = {}
): Promise<ComplianceMetrics[]> {
  const { start_date, end_date } = params

  const { data, error } = await (supabase as any)
    .rpc('get_analytics_compliance_violations', {
      start_date: start_date || null,
      end_date: end_date || null,
    })

  if (error) {
    throw new Error(`Failed to fetch compliance metrics: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

/**
 * Get revenue metrics over time
 * @param params - Optional start and end date filters
 * @returns Array of revenue metrics by date
 */
export async function getRevenueMetrics(
  params: RevenueQueryParams = {}
): Promise<RevenueMetrics[]> {
  const { start_date, end_date } = params

  const { data, error } = await (supabase as any)
    .rpc('get_analytics_revenue', {
      start_date: start_date || null,
      end_date: end_date || null,
    })

  if (error) {
    throw new Error(`Failed to fetch revenue metrics: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// BOOKING SUMMARY ANALYTICS
// ============================================================================

/**
 * Get booking summary metrics over time
 * @param params - Optional start and end date filters
 * @returns Array of booking metrics by date
 */
export async function getBookingMetrics(
  params: BookingSummaryQueryParams = {}
): Promise<BookingMetrics[]> {
  const { start_date, end_date } = params

  const { data, error } = await (supabase as any)
    .rpc('get_analytics_booking_summary', {
      start_date: start_date || null,
      end_date: end_date || null,
    })

  if (error) {
    throw new Error(`Failed to fetch booking metrics: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// AGGREGATED ANALYTICS DASHBOARD
// ============================================================================

/**
 * Get all analytics data for the dashboard in a single call
 * This is more efficient than calling individual functions multiple times
 * @param params - Optional date range filter for all time-series metrics
 * @returns Object containing all analytics data
 */
export async function getAnalyticsDashboard(params?: {
  start_date?: string
  end_date?: string
}) {
  const start_date = params?.start_date || null
  const end_date = params?.end_date || null

  // Fetch all time-series metrics in parallel for better performance
  const [
    userGrowth,
    jobCompletion,
    transactionVolume,
    geographicDistribution,
    trendingCategories,
    compliance,
    revenue,
    bookings,
  ] = await Promise.all([
    getUserGrowthMetrics({ start_date, end_date }),
    getJobCompletionMetrics({ start_date, end_date }),
    getTransactionVolumeMetrics({ start_date, end_date }),
    getGeographicDistribution(),
    getTrendingCategories(),
    getComplianceMetrics({ start_date, end_date }),
    getRevenueMetrics({ start_date, end_date }),
    getBookingMetrics({ start_date, end_date }),
  ])

  return {
    user_growth: {
      metrics: userGrowth,
    },
    job_completion: {
      metrics: jobCompletion,
    },
    transaction_volume: {
      metrics: transactionVolume,
    },
    geographic_distribution: {
      data: geographicDistribution,
    },
    trending_categories: {
      data: trendingCategories,
    },
    compliance: {
      metrics: compliance,
    },
    revenue: {
      metrics: revenue,
    },
    bookings: {
      metrics: bookings,
    },
  }
}

export async function getPlatformMetrics(): Promise<{
  users: {
    total: number
    workers: number
    businesses: number
    admins: number
    newThisWeek: number
    newThisMonth: number
  }
  jobs: {
    total: number
    active: number
    completed: number
    cancelled: number
    newThisWeek: number
    newThisMonth: number
  }
  bookings: {
    total: number
    pending: number
    inProgress: number
    completed: number
    cancelled: number
    newThisWeek: number
    newThisMonth: number
  }
  transactions: {
    total: number
    totalVolume: number
    pendingVolume: number
    completedVolume: number
    thisWeekVolume: number
    thisMonthVolume: number
  }
  verifications: {
    pendingBusiness: number
    pendingKYC: number
    approvedThisWeek: number
    rejectedThisWeek: number
  }
  disputes: {
    open: number
    resolvedThisWeek: number
    resolvedThisMonth: number
    avgResolutionTime: number
  }
  reports: {
    pending: number
    open: number
    resolvedThisWeek: number
  }
} | null> {
  try {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const [
      { count: totalUsers },
      { count: workerCount },
      { count: businessCount },
      { count: adminCount },
      { count: newUsersThisWeek },
      { count: newUsersThisMonth },
      { count: totalJobs },
      { count: activeJobs },
      { count: completedJobs },
      { count: cancelledJobs },
      { count: newJobsThisWeek },
      { count: newJobsThisMonth },
      { count: totalBookings },
      { count: pendingBookings },
      { count: inProgressBookings },
      { count: completedBookings },
      { count: cancelledBookings },
      { count: newBookingsThisWeek },
      { count: newBookingsThisMonth },
      { count: pendingBusinessVerifications },
      { count: pendingKYCVerifications },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin' as any),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', oneMonthAgo.toISOString()),
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', oneMonthAgo.toISOString()),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', oneMonthAgo.toISOString()),
      supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      (supabase as any).from('kyc_verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    return {
      users: {
        total: totalUsers ?? 0,
        workers: workerCount ?? 0,
        businesses: businessCount ?? 0,
        admins: adminCount ?? 0,
        newThisWeek: newUsersThisWeek ?? 0,
        newThisMonth: newUsersThisMonth ?? 0,
      },
      jobs: {
        total: totalJobs ?? 0,
        active: activeJobs ?? 0,
        completed: completedJobs ?? 0,
        cancelled: cancelledJobs ?? 0,
        newThisWeek: newJobsThisWeek ?? 0,
        newThisMonth: newJobsThisMonth ?? 0,
      },
      bookings: {
        total: totalBookings ?? 0,
        pending: pendingBookings ?? 0,
        inProgress: inProgressBookings ?? 0,
        completed: completedBookings ?? 0,
        cancelled: cancelledBookings ?? 0,
        newThisWeek: newBookingsThisWeek ?? 0,
        newThisMonth: newBookingsThisMonth ?? 0,
      },
      transactions: {
        total: 0,
        totalVolume: 0,
        pendingVolume: 0,
        completedVolume: 0,
        thisWeekVolume: 0,
        thisMonthVolume: 0,
      },
      verifications: {
        pendingBusiness: pendingBusinessVerifications ?? 0,
        pendingKYC: pendingKYCVerifications ?? 0,
        approvedThisWeek: 0,
        rejectedThisWeek: 0,
      },
      disputes: {
        open: 0,
        resolvedThisWeek: 0,
        resolvedThisMonth: 0,
        avgResolutionTime: 0,
      },
      reports: {
        pending: 0,
        open: 0,
        resolvedThisWeek: 0,
      },
    }
  } catch (error) {
    console.error('Failed to fetch platform metrics:', error)
    return null
  }
}

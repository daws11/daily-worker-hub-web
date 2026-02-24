"use server"

import { createClient } from "../supabase/server"
import {
  getUserGrowthMetrics,
  getJobCompletionMetrics,
  getTransactionVolumeMetrics,
  getGeographicDistribution,
  getTrendingCategories,
  getComplianceMetrics,
  getRevenueMetrics,
  getBookingMetrics,
  getDailyActiveUsers,
  getMonthlyActiveUsers,
  refreshDailyActiveUsers as refreshDailyActiveUsersQuery,
  refreshMonthlyActiveUsers as refreshMonthlyActiveUsersQuery,
  getAnalyticsDashboard as getAnalyticsDashboardQuery,
} from "../supabase/queries/analytics"
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
  AnalyticsDashboardData,
  DateRangeFilter,
} from "../types/analytics"
import { ANALYTICS_CONSTANTS } from "../types/analytics"

// ============================================================================
// RESULT TYPES
// ============================================================================

export type AnalyticsResult<T> = {
  success: boolean
  error?: string
  data?: T
}

export type UserGrowthResult = AnalyticsResult<UserGrowthMetrics[]>

export type JobCompletionResult = AnalyticsResult<JobCompletionMetrics[]>

export type TransactionVolumeResult = AnalyticsResult<TransactionVolumeMetrics[]>

export type GeographicDistributionResult = AnalyticsResult<GeographicDistribution[]>

export type TrendingCategoriesResult = AnalyticsResult<TrendingCategory[]>

export type ComplianceMetricsResult = AnalyticsResult<ComplianceMetrics[]>

export type RevenueMetricsResult = AnalyticsResult<RevenueMetrics[]>

export type BookingMetricsResult = AnalyticsResult<BookingMetrics[]>

export type DailyActiveUsersResult = AnalyticsResult<DailyActiveUsers[]>

export type MonthlyActiveUsersResult = AnalyticsResult<MonthlyActiveUsers[]>

// Type for what the dashboard query actually returns (without summaries)
type AnalyticsDashboardQueryResult = {
  user_growth: { metrics: UserGrowthMetrics[] }
  job_completion: { metrics: JobCompletionMetrics[] }
  transaction_volume: { metrics: TransactionVolumeMetrics[] }
  geographic_distribution: { data: GeographicDistribution[] }
  trending_categories: { data: TrendingCategory[] }
  compliance: { metrics: ComplianceMetrics[] }
  revenue: { metrics: RevenueMetrics[] }
  bookings: { metrics: BookingMetrics[] }
}

export type AnalyticsDashboardResult = AnalyticsResult<AnalyticsDashboardQueryResult>

export type RefreshResult = AnalyticsResult<{ message: string }>

// ============================================================================
// ADMIN VERIFICATION
// ============================================================================

/**
 * Verify that the current user has admin role
 * @returns true if user is admin, false otherwise
 */
async function verifyAdminAccess(): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { isAdmin: false, error: "User tidak terautentikasi" }
    }

    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return { isAdmin: false, error: "Profil tidak ditemukan" }
    }

    if (profile.role !== "admin") {
      return { isAdmin: false, error: "Akses ditolak. Hanya admin yang dapat mengakses analytics" }
    }

    return { isAdmin: true, userId: profile.id }
  } catch (error) {
    return { isAdmin: false, error: "Gagal memverifikasi akses admin" }
  }
}

// ============================================================================
// DATE RANGE VALIDATION
// ============================================================================

/**
 * Validate and parse date range filter
 * Returns ISO date strings or defaults to last 30 days
 */
function validateDateRange(dateRange?: DateRangeFilter): { start_date: string; end_date: string; error?: string } {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.setHours(23, 59, 59, 999))

  if (dateRange?.start_date && dateRange?.end_date) {
    startDate = new Date(dateRange.start_date)
    endDate = new Date(dateRange.end_date)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        start_date: "",
        end_date: "",
        error: "Format tanggal tidak valid",
      }
    }

    if (startDate > endDate) {
      return {
        start_date: "",
        end_date: "",
        error: "Tanggal mulai tidak boleh lebih besar dari tanggal selesai",
      }
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > ANALYTICS_CONSTANTS.MAX_DATE_RANGE_DAYS) {
      return {
        start_date: "",
        end_date: "",
        error: `Rentang tanggal maksimal adalah ${ANALYTICS_CONSTANTS.MAX_DATE_RANGE_DAYS} hari`,
      }
    }
  } else if (dateRange?.preset) {
    const preset = dateRange.preset

    switch (preset) {
      case "today":
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        break
      case "yesterday":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        endDate.setDate(endDate.getDate() - 1)
        endDate.setHours(23, 59, 59, 999)
        break
      case "last_7_days":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case "last_30_days":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
        break
      case "last_90_days":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 90)
        startDate.setHours(0, 0, 0, 0)
        break
      case "this_month":
        startDate = new Date()
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "last_month":
        startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        endDate.setDate(0)
        endDate.setHours(23, 59, 59, 999)
        break
      case "this_year":
        startDate = new Date()
        startDate.setMonth(0, 1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "custom":
        if (!dateRange.start_date || !dateRange.end_date) {
          return {
            start_date: "",
            end_date: "",
            error: "Tanggal mulai dan selesai harus diisi untuk preset custom",
          }
        }
        startDate = new Date(dateRange.start_date)
        endDate = new Date(dateRange.end_date)
        break
      default:
        startDate = new Date()
        startDate.setDate(startDate.getDate() - ANALYTICS_CONSTANTS.DEFAULT_DATE_RANGE_DAYS)
        startDate.setHours(0, 0, 0, 0)
    }
  } else {
    startDate = new Date()
    startDate.setDate(startDate.getDate() - ANALYTICS_CONSTANTS.DEFAULT_DATE_RANGE_DAYS)
    startDate.setHours(0, 0, 0, 0)
  }

  return {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  }
}

// ============================================================================
// USER GROWTH ANALYTICS ACTIONS
// ============================================================================

/**
 * Get user growth metrics with optional date filtering
 * Requires admin role
 */
export async function getAnalyticsUserGrowth(
  dateRange?: DateRangeFilter
): Promise<UserGrowthResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const validation = validateDateRange(dateRange)
    if (validation.error) {
      return { success: false, error: validation.error }
    }

    const data = await getUserGrowthMetrics({
      start_date: validation.start_date,
      end_date: validation.end_date,
    })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data user growth: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Get daily active users (DAU) metrics
 * Requires admin role
 */
export async function getAnalyticsDailyActiveUsers(): Promise<DailyActiveUsersResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const data = await getDailyActiveUsers()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data daily active users: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Get monthly active users (MAU) metrics
 * Requires admin role
 */
export async function getAnalyticsMonthlyActiveUsers(): Promise<MonthlyActiveUsersResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const data = await getMonthlyActiveUsers()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data monthly active users: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// JOB COMPLETION ANALYTICS ACTIONS
// ============================================================================

/**
 * Get job completion metrics with optional date filtering
 * Requires admin role
 */
export async function getAnalyticsJobCompletion(
  dateRange?: DateRangeFilter
): Promise<JobCompletionResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const validation = validateDateRange(dateRange)
    if (validation.error) {
      return { success: false, error: validation.error }
    }

    const data = await getJobCompletionMetrics({
      start_date: validation.start_date,
      end_date: validation.end_date,
    })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data job completion: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// TRANSACTION VOLUME ANALYTICS ACTIONS
// ============================================================================

/**
 * Get transaction volume metrics with optional date filtering
 * Requires admin role
 */
export async function getAnalyticsTransactionVolume(
  dateRange?: DateRangeFilter
): Promise<TransactionVolumeResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const validation = validateDateRange(dateRange)
    if (validation.error) {
      return { success: false, error: validation.error }
    }

    const data = await getTransactionVolumeMetrics({
      start_date: validation.start_date,
      end_date: validation.end_date,
    })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data transaction volume: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// GEOGRAPHIC DISTRIBUTION ANALYTICS ACTIONS
// ============================================================================

/**
 * Get geographic distribution of workers and jobs
 * Requires admin role
 */
export async function getAnalyticsGeographicDistribution(): Promise<GeographicDistributionResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const data = await getGeographicDistribution()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data geographic distribution: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// TRENDING CATEGORIES ANALYTICS ACTIONS
// ============================================================================

/**
 * Get trending job categories by demand
 * Requires admin role
 */
export async function getAnalyticsTrendingCategories(): Promise<TrendingCategoriesResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const data = await getTrendingCategories()

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data trending categories: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// COMPLIANCE VIOLATIONS ANALYTICS ACTIONS
// ============================================================================

/**
 * Get compliance/KYC verification metrics with optional date filtering
 * Requires admin role
 */
export async function getAnalyticsCompliance(
  dateRange?: DateRangeFilter
): Promise<ComplianceMetricsResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const validation = validateDateRange(dateRange)
    if (validation.error) {
      return { success: false, error: validation.error }
    }

    const data = await getComplianceMetrics({
      start_date: validation.start_date,
      end_date: validation.end_date,
    })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data compliance: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// REVENUE ANALYTICS ACTIONS
// ============================================================================

/**
 * Get revenue metrics with optional date filtering
 * Requires admin role
 */
export async function getAnalyticsRevenue(
  dateRange?: DateRangeFilter
): Promise<RevenueMetricsResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const validation = validateDateRange(dateRange)
    if (validation.error) {
      return { success: false, error: validation.error }
    }

    const data = await getRevenueMetrics({
      start_date: validation.start_date,
      end_date: validation.end_date,
    })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data revenue: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// BOOKING SUMMARY ANALYTICS ACTIONS
// ============================================================================

/**
 * Get booking summary metrics with optional date filtering
 * Requires admin role
 */
export async function getAnalyticsBookings(
  dateRange?: DateRangeFilter
): Promise<BookingMetricsResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const validation = validateDateRange(dateRange)
    if (validation.error) {
      return { success: false, error: validation.error }
    }

    const data = await getBookingMetrics({
      start_date: validation.start_date,
      end_date: validation.end_date,
    })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data bookings: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// AGGREGATED DASHBOARD ACTION
// ============================================================================

/**
 * Get all analytics data for the dashboard in a single call
 * This is more efficient than calling individual actions
 * Requires admin role
 */
export async function getAnalyticsDashboard(
  dateRange?: DateRangeFilter
): Promise<AnalyticsDashboardResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    const validation = validateDateRange(dateRange)
    if (validation.error) {
      return { success: false, error: validation.error }
    }

    const data = await getAnalyticsDashboardQuery({
      start_date: validation.start_date,
      end_date: validation.end_date,
    })

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: `Gagal mengambil data analytics dashboard: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// MATERIALIZED VIEW REFRESH ACTIONS
// ============================================================================

/**
 * Refresh the daily active users materialized view
 * Requires admin role
 */
export async function refreshAnalyticsDailyActiveUsers(): Promise<RefreshResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    await refreshDailyActiveUsersQuery()

    return { success: true, data: { message: "Daily active users berhasil di-refresh" } }
  } catch (error) {
    return {
      success: false,
      error: `Gagal me-refresh daily active users: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Refresh the monthly active users materialized view
 * Requires admin role
 */
export async function refreshAnalyticsMonthlyActiveUsers(): Promise<RefreshResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    await refreshMonthlyActiveUsersQuery()

    return { success: true, data: { message: "Monthly active users berhasil di-refresh" } }
  } catch (error) {
    return {
      success: false,
      error: `Gagal me-refresh monthly active users: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

/**
 * Refresh all analytics materialized views
 * Requires admin role
 */
export async function refreshAllAnalytics(): Promise<RefreshResult> {
  try {
    const adminCheck = await verifyAdminAccess()
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error }
    }

    await Promise.all([
      refreshDailyActiveUsersQuery(),
      refreshMonthlyActiveUsersQuery(),
    ])

    return { success: true, data: { message: "Semua analytics materialized views berhasil di-refresh" } }
  } catch (error) {
    return {
      success: false,
      error: `Gagal me-refresh analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

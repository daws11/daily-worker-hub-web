"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import {
  getStartOfMonth,
  getEndOfMonth,
  getStartOfDay,
  getEndOfDay,
} from "../utils/date"
import {
  calculateTotalEarnings,
  calculateEarningsInDateRange,
  groupTransactionsByMonth,
  calculateMonthlyEarnings,
  groupTransactionsByPosition,
  calculateEarningsByPosition,
  calculateAveragePerBooking,
  calculateBookingFrequency,
  calculateTrend,
  createIncomeProjection,
  calculatePeriodStartDate,
} from "../utils/earnings-calculator"
import { EARNINGS_CONSTANTS } from "../types/earnings"

type Booking = {
  id: string
  worker_id: string
  job_id: string
  business_id: string
  status: Database["public"]["Enums"]["booking_status"]
  final_price: number | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

type Job = {
  id: string
  title: string
  budget_min: number
  budget_max: number
  category_id: string
  business_id: string
}

type Business = {
  id: string
  name: string
  user_id: string
}

type Transaction = {
  id: string
  amount: number
  booking_id: string
  type: Database["public"]["Enums"]["transaction_type"]
  status: Database["public"]["Enums"]["transaction_status"]
  created_at: string
  provider_transaction_id: string | null
}

// Combined booking with job and business data
type BookingWithDetails = Booking & {
  jobs: Job | null
  businesses: Business | null
  transactions: Transaction[]
}

// Result types
export type EarningsSummaryResult = {
  success: boolean
  error?: string
  data?: {
    total_earnings: number
    current_month_earnings: number
    previous_month_earnings: number
    month_over_month_change: number
    total_bookings_completed: number
    average_earnings_per_booking: number
    currency: string
    period_start: string
    period_end: string
  }
}

export type MonthlyEarningsResult = {
  success: boolean
  error?: string
  data?: {
    monthly_earnings: Array<{
      month: string
      month_name: string
      earnings: number
      bookings_count: number
      average_earning: number
    }>
    total_earnings: number
    total_bookings: number
    highest_earning_month: {
      month: string
      month_name: string
      earnings: number
      bookings_count: number
      average_earning: number
    } | null
    lowest_earning_month: {
      month: string
      month_name: string
      earnings: number
      bookings_count: number
      average_earning: number
    } | null
    average_monthly_earnings: number
  }
}

export type EarningsByPositionResult = {
  success: boolean
  error?: string
  data?: {
    positions: Array<{
      position_title: string
      category_name: string | null
      total_earnings: number
      bookings_count: number
      average_earning: number
      highest_single_earning: number
      lowest_single_earning: number
      last_booking_date: string | null
    }>
    best_performing_position: {
      position_title: string
      category_name: string | null
      total_earnings: number
      bookings_count: number
      average_earning: number
      highest_single_earning: number
      lowest_single_earning: number
      last_booking_date: string | null
    } | null
    total_positions: number
  }
}

export type TransactionHistoryResult = {
  success: boolean
  error?: string
  data?: {
    transactions: Array<{
      id: string
      amount: number
      type: "payment" | "refund"
      status: "pending" | "success" | "failed"
      booking_id: string
      job_title: string
      business_name: string
      created_at: string
      completed_at: string | null
    }>
    total: number
    page: number
    limit: number
    total_pages: number
    total_amount: number
  }
}

export type IncomeProjectionResult = {
  success: boolean
  error?: string
  data?: {
    period: "week" | "month" | "quarter"
    projected_income: number
    confidence: "low" | "medium" | "high"
    calculation_method: "simple_average" | "trend_based" | "booking_based"
    factors: {
      recent_bookings_count: number
      average_earning_per_booking: number
      booking_frequency: number
      trend_percentage: number
    }
    calculated_at: string
  }
}

/**
 * Get earnings summary for a worker
 * Includes total lifetime earnings, current/previous month comparison, and averages
 */
export async function getEarningsSummary(
  workerId: string,
  period: "today" | "week" | "month" | "quarter" | "year" | "all_time" = "all_time"
): Promise<EarningsSummaryResult> {
  try {
    const supabase = await createClient()

    // Calculate date range based on period
    const endDate = new Date().toISOString()
    const startDate = calculatePeriodStartDate(period, endDate)

    // Fetch completed bookings with job and business details
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from("bookings")
      .select(
        `
        id,
        worker_id,
        job_id,
        business_id,
        status,
        final_price,
        start_date,
        end_date,
        created_at,
        updated_at,
        jobs(id, title, budget_min, budget_max, category_id, business_id),
        businesses(id, name, user_id)
        `
      )
      .eq("worker_id", workerId)
      .eq("status", "completed")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false })

    if (bookingsError) {
      return { success: false, error: `Gagal mengambil data pendapatan: ${bookingsError.message}` }
    }

    // Transform bookings into transaction format
    const transactions = (bookings || [])
      .filter((booking: BookingWithDetails) => booking.final_price != null)
      .map((booking: BookingWithDetails) => ({
        id: booking.id,
        amount: booking.final_price || 0,
        type: "payment" as const,
        status: "success" as const,
        booking_id: booking.id,
        job_title: booking.jobs?.title || "Unknown",
        business_name: booking.businesses?.name || "Unknown",
        created_at: booking.created_at,
        completed_at: booking.end_date || booking.updated_at,
      }))

    // Calculate current and previous month dates
    const now = new Date()
    const currentMonthStart = getStartOfMonth(now.toISOString())
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthStart = getStartOfMonth(previousMonthDate.toISOString())
    const previousMonthEnd = getEndOfMonth(previousMonthDate.toISOString())

    // Calculate earnings using utility functions
    const totalEarnings = calculateTotalEarnings(transactions)
    const currentMonthEarnings = calculateEarningsInDateRange(
      transactions,
      currentMonthStart,
      endDate
    )
    const previousMonthEarnings = calculateEarningsInDateRange(
      transactions,
      previousMonthStart,
      previousMonthEnd
    )

    const totalBookings = transactions.length
    const averagePerBooking = calculateAveragePerBooking(totalEarnings, totalBookings)

    // Calculate month-over-month change
    let monthOverMonthChange = 0
    if (previousMonthEarnings > 0) {
      monthOverMonthChange = ((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100
    } else if (currentMonthEarnings > 0) {
      monthOverMonthChange = 100 // First month with earnings
    }

    return {
      success: true,
      data: {
        total_earnings: totalEarnings,
        current_month_earnings: currentMonthEarnings,
        previous_month_earnings: previousMonthEarnings,
        month_over_month_change: Math.round(monthOverMonthChange * 10) / 10,
        total_bookings_completed: totalBookings,
        average_earnings_per_booking: Math.round(averagePerBooking),
        currency: "IDR",
        period_start: startDate,
        period_end: endDate,
      },
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil ringkasan pendapatan" }
  }
}

/**
 * Get monthly earnings data for charts
 */
export async function getMonthlyEarnings(
  workerId: string,
  months: number = 12,
  startDate?: string,
  endDate?: string
): Promise<MonthlyEarningsResult> {
  try {
    const supabase = await createClient()

    // Calculate start date (go back specified number of months)
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear(), end.getMonth() - months + 1, 1)

    const startDateStr = start.toISOString()
    const endDateStr = end.toISOString()

    // Fetch completed bookings with job details
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from("bookings")
      .select(
        `
        id,
        worker_id,
        job_id,
        business_id,
        status,
        final_price,
        start_date,
        end_date,
        created_at,
        updated_at,
        jobs(id, title, budget_min, budget_max, category_id, business_id),
        businesses(id, name, user_id)
        `
      )
      .eq("worker_id", workerId)
      .eq("status", "completed")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)
      .order("created_at", { ascending: false })

    if (bookingsError) {
      return { success: false, error: `Gagal mengambil data pendapatan bulanan: ${bookingsError.message}` }
    }

    // Transform bookings into transaction format
    const transactions = (bookings || [])
      .filter((booking: BookingWithDetails) => booking.final_price != null)
      .map((booking: BookingWithDetails) => ({
        id: booking.id,
        amount: booking.final_price || 0,
        type: "payment" as const,
        status: "success" as const,
        booking_id: booking.id,
        job_title: booking.jobs?.title || "Unknown",
        business_name: booking.businesses?.name || "Unknown",
        created_at: booking.created_at,
        completed_at: booking.end_date || booking.updated_at,
      }))

    // Group transactions by month and calculate earnings
    const groupedTransactions = groupTransactionsByMonth(transactions)
    const monthlyEarningsData = calculateMonthlyEarnings(groupedTransactions)

    // Calculate statistics
    const totalEarnings = calculateTotalEarnings(transactions)
    const totalBookings = transactions.length
    const averageMonthlyEarnings =
      monthlyEarningsData.length > 0
        ? Math.round(totalEarnings / monthlyEarningsData.length)
        : 0

    // Find highest and lowest earning months
    const highestEarningMonth =
      monthlyEarningsData.length > 0
        ? monthlyEarningsData.reduce((max, month) =>
            month.earnings > max.earnings ? month : max
          )
        : null

    const lowestEarningMonth =
      monthlyEarningsData.length > 0
        ? monthlyEarningsData.reduce((min, month) =>
            month.earnings < min.earnings ? month : min
          )
        : null

    return {
      success: true,
      data: {
        monthly_earnings: monthlyEarningsData,
        total_earnings: totalEarnings,
        total_bookings: totalBookings,
        highest_earning_month: highestEarningMonth,
        lowest_earning_month: lowestEarningMonth,
        average_monthly_earnings: averageMonthlyEarnings,
      },
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil data pendapatan bulanan" }
  }
}

/**
 * Get earnings grouped by position type
 */
export async function getEarningsByPosition(
  workerId: string,
  sortBy: "earnings" | "bookings" | "average" = "earnings",
  sortOrder: "asc" | "desc" = "desc",
  limit?: number
): Promise<EarningsByPositionResult> {
  try {
    const supabase = await createClient()

    // Fetch all completed bookings with job details
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from("bookings")
      .select(
        `
        id,
        worker_id,
        job_id,
        business_id,
        status,
        final_price,
        start_date,
        end_date,
        created_at,
        updated_at,
        jobs(id, title, budget_min, budget_max, category_id, business_id),
        businesses(id, name, user_id)
        `
      )
      .eq("worker_id", workerId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })

    if (bookingsError) {
      return { success: false, error: `Gagal mengambil data pendapatan per posisi: ${bookingsError.message}` }
    }

    // Transform bookings into transaction format
    const transactions = (bookings || [])
      .filter((booking: BookingWithDetails) => booking.final_price != null)
      .map((booking: BookingWithDetails) => ({
        id: booking.id,
        amount: booking.final_price || 0,
        type: "payment" as const,
        status: "success" as const,
        booking_id: booking.id,
        job_title: booking.jobs?.title || "Unknown",
        business_name: booking.businesses?.name || "Unknown",
        created_at: booking.created_at,
        completed_at: booking.end_date || booking.updated_at,
      }))

    // Group by position and calculate earnings
    const groupedByPosition = groupTransactionsByPosition(transactions)
    let positionEarnings = calculateEarningsByPosition(groupedByPosition)

    // Sort by specified field
    positionEarnings.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "earnings":
          comparison = a.total_earnings - b.total_earnings
          break
        case "bookings":
          comparison = a.bookings_count - b.bookings_count
          break
        case "average":
          comparison = a.average_earning - b.average_earning
          break
      }
      return sortOrder === "desc" ? -comparison : comparison
    })

    // Apply limit if specified
    if (limit && limit > 0) {
      positionEarnings = positionEarnings.slice(0, limit)
    }

    // Find best performing position (by total earnings)
    const bestPerformingPosition =
      positionEarnings.length > 0 ? positionEarnings[0] : null

    return {
      success: true,
      data: {
        positions: positionEarnings,
        best_performing_position: bestPerformingPosition,
        total_positions: positionEarnings.length,
      },
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil data pendapatan per posisi" }
  }
}

/**
 * Get earnings transaction history with pagination
 */
export async function getEarningsTransactionHistory(
  workerId: string,
  page: number = 1,
  limit: number = 20,
  type?: "payment" | "refund",
  status?: "pending" | "success" | "failed",
  startDate?: string,
  endDate?: string,
  sortOrder: "date_asc" | "date_desc" | "amount_asc" | "amount_desc" = "date_desc"
): Promise<TransactionHistoryResult> {
  try {
    const supabase = await createClient()

    // Validate pagination parameters
    const validLimit = Math.min(
      Math.max(limit, 1),
      EARNINGS_CONSTANTS.MAX_TRANSACTION_LIMIT
    )
    const validPage = Math.max(page, 1)
    const offset = (validPage - 1) * validLimit

    // Build query for bookings
    let query = (supabase as any)
      .from("bookings")
      .select(
        `
        id,
        worker_id,
        job_id,
        business_id,
        status,
        final_price,
        start_date,
        end_date,
        created_at,
        updated_at,
        jobs(id, title, budget_min, budget_max, category_id, business_id),
        businesses(id, name, user_id)
        `,
        { count: "exact" }
      )
      .eq("worker_id", workerId)
      .eq("status", "completed")

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    // Apply sorting
    const [sortColumn, sortDirection] = sortOrder.split("_")
    const columnMap: Record<string, string> = {
      date: "created_at",
      amount: "final_price",
    }
    query = query.order(columnMap[sortColumn] || "created_at", {
      ascending: sortDirection === "asc",
    })

    // Apply pagination
    query = query.range(offset, offset + validLimit - 1)

    const { data: bookings, error: bookingsError, count } = await query

    if (bookingsError) {
      return {
        success: false,
        error: `Gagal mengambil riwayat transaksi: ${bookingsError.message}`,
      }
    }

    // Transform bookings into transaction format
    const transactions = (bookings || [])
      .filter((booking: BookingWithDetails) => booking.final_price != null)
      .map((booking: BookingWithDetails) => ({
        id: booking.id,
        amount: booking.final_price || 0,
        type: "payment" as const,
        status: "success" as const,
        booking_id: booking.id,
        job_title: booking.jobs?.title || "Unknown",
        business_name: booking.businesses?.name || "Unknown",
        created_at: booking.created_at,
        completed_at: booking.end_date || booking.updated_at,
      }))

    // Calculate total amount
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

    // Calculate total pages
    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / validLimit)

    return {
      success: true,
      data: {
        transactions,
        total: totalItems,
        page: validPage,
        limit: validLimit,
        total_pages: totalPages,
        total_amount: totalAmount,
      },
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil riwayat transaksi" }
  }
}

/**
 * Get income projection for a worker
 * Projects future earnings based on current trends
 */
export async function getIncomeProjection(
  workerId: string,
  period: "week" | "month" | "quarter" = "month",
  calculationMethod: "simple_average" | "trend_based" | "booking_based" = "simple_average"
): Promise<IncomeProjectionResult> {
  try {
    const supabase = await createClient()

    // Calculate date range for recent data (last 3 months)
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 3)

    const startDateStr = startDate.toISOString()
    const endDateStr = endDate.toISOString()

    // Fetch completed bookings
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from("bookings")
      .select(
        `
        id,
        worker_id,
        job_id,
        business_id,
        status,
        final_price,
        start_date,
        end_date,
        created_at,
        updated_at,
        jobs(id, title, budget_min, budget_max, category_id, business_id),
        businesses(id, name, user_id)
        `
      )
      .eq("worker_id", workerId)
      .eq("status", "completed")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)
      .order("created_at", { ascending: true })

    if (bookingsError) {
      return {
        success: false,
        error: `Gagal mengambil data proyeksi pendapatan: ${bookingsError.message}`,
      }
    }

    // Transform bookings into transaction format
    const transactions = (bookings || [])
      .filter((booking: BookingWithDetails) => booking.final_price != null)
      .map((booking: BookingWithDetails) => ({
        id: booking.id,
        amount: booking.final_price || 0,
        type: "payment" as const,
        status: "success" as const,
        booking_id: booking.id,
        job_title: booking.jobs?.title || "Unknown",
        business_name: booking.businesses?.name || "Unknown",
        created_at: booking.created_at,
        completed_at: booking.end_date || booking.updated_at,
      }))

    // Check if we have enough data for projection
    if (transactions.length < EARNINGS_CONSTANTS.LOW_CONFIDENCE_THRESHOLD) {
      return {
        success: false,
        error: "Data tidak cukup untuk membuat proyeksi pendapatan. Minimal 3 booking selesai diperlukan.",
      }
    }

    // Calculate projection factors
    const totalEarnings = calculateTotalEarnings(transactions)
    const recentBookingsCount = transactions.length
    const averageEarningPerBooking = calculateAveragePerBooking(
      totalEarnings,
      recentBookingsCount
    )

    // Calculate booking frequency (bookings per week)
    const bookingFrequency = calculateBookingFrequency(
      recentBookingsCount,
      startDateStr,
      endDateStr
    )

    // Calculate trend (comparing last month to previous month)
    const now = new Date()
    const currentMonthStart = getStartOfMonth(now.toISOString())
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthStart = getStartOfMonth(previousMonthDate.toISOString())
    const previousMonthEnd = getEndOfMonth(previousMonthDate.toISOString())

    const currentMonthEarnings = calculateEarningsInDateRange(
      transactions,
      currentMonthStart,
      endDateStr
    )
    const previousMonthEarnings = calculateEarningsInDateRange(
      transactions,
      previousMonthStart,
      previousMonthEnd
    )

    const trendPercentage = calculateTrend(currentMonthEarnings, previousMonthEarnings)

    // Calculate projection based on method
    let projectedIncome = 0
    let weeksInPeriod = 1

    switch (period) {
      case "week":
        weeksInPeriod = 1
        break
      case "month":
        weeksInPeriod = 4
        break
      case "quarter":
        weeksInPeriod = 12
        break
    }

    switch (calculationMethod) {
      case "simple_average":
        projectedIncome =
          averageEarningPerBooking * bookingFrequency * weeksInPeriod
        break
      case "trend_based":
        // Use current month earnings adjusted by trend
        const monthlyEarnings = currentMonthEarnings > 0
          ? currentMonthEarnings
          : previousMonthEarnings
        projectedIncome = (monthlyEarnings * (1 + trendPercentage / 100) / 4) * weeksInPeriod
        break
      case "booking_based":
        // Simple average method for booking-based
        projectedIncome =
          averageEarningPerBooking * bookingFrequency * weeksInPeriod
        break
    }

    // Create projection object
    const projection = createIncomeProjection(
      period,
      projectedIncome,
      recentBookingsCount,
      averageEarningPerBooking,
      bookingFrequency,
      trendPercentage,
      calculationMethod,
      EARNINGS_CONSTANTS
    )

    return {
      success: true,
      data: projection,
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menghitung proyeksi pendapatan" }
  }
}

/**
 * Get complete earnings dashboard data
 * Fetches all required data for the earnings analytics page
 */
export async function getEarningsDashboardData(
  workerId: string,
  monthsToDisplay: number = 12,
  includeProjection: boolean = true,
  projectionPeriod: "week" | "month" | "quarter" = "month"
): Promise<{
  success: boolean
  error?: string
  data?: {
    summary: {
      total_earnings: number
      current_month_earnings: number
      previous_month_earnings: number
      month_over_month_change: number
      total_bookings_completed: number
      average_earnings_per_booking: number
      currency: string
      period_start: string
      period_end: string
    }
    monthly_earnings: Array<{
      month: string
      month_name: string
      earnings: number
      bookings_count: number
      average_earning: number
    }>
    earnings_by_position: Array<{
      position_title: string
      category_name: string | null
      total_earnings: number
      bookings_count: number
      average_earning: number
      highest_single_earning: number
      lowest_single_earning: number
      last_booking_date: string | null
    }>
    recent_transactions: Array<{
      id: string
      amount: number
      type: "payment" | "refund"
      status: "pending" | "success" | "failed"
      booking_id: string
      job_title: string
      business_name: string
      created_at: string
      completed_at: string | null
    }>
    projection: {
      period: "week" | "month" | "quarter"
      projected_income: number
      confidence: "low" | "medium" | "high"
      calculation_method: "simple_average" | "trend_based" | "booking_based"
      factors: {
        recent_bookings_count: number
        average_earning_per_booking: number
        booking_frequency: number
        trend_percentage: number
      }
      calculated_at: string
    } | null
  }
}> {
  try {
    // Fetch all data in parallel for better performance
    const [summaryResult, monthlyResult, positionResult, transactionResult] =
      await Promise.all([
        getEarningsSummary(workerId, "all_time"),
        getMonthlyEarnings(workerId, monthsToDisplay),
        getEarningsByPosition(workerId, "earnings", "desc", 10),
        getEarningsTransactionHistory(workerId, 1, 10),
      ])

    if (!summaryResult.success) {
      return { success: false, error: summaryResult.error }
    }

    if (!monthlyResult.success) {
      return { success: false, error: monthlyResult.error }
    }

    if (!positionResult.success) {
      return { success: false, error: positionResult.error }
    }

    if (!transactionResult.success) {
      return { success: false, error: transactionResult.error }
    }

    // Fetch projection if requested
    let projection = null
    if (includeProjection) {
      const projectionResult = await getIncomeProjection(
        workerId,
        projectionPeriod
      )
      if (projectionResult.success) {
        projection = projectionResult.data || null
      }
      // Don't fail the entire request if projection fails
    }

    return {
      success: true,
      data: {
        summary: summaryResult.data!,
        monthly_earnings: monthlyResult.data!.monthly_earnings,
        earnings_by_position: positionResult.data!.positions,
        recent_transactions: transactionResult.data!.transactions,
        projection,
      },
    }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil data dashboard pendapatan" }
  }
}

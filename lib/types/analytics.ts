import { Database } from '../supabase/types'

// ============================================================================
// DATE RANGE TYPES
// ============================================================================

export type DateRangePreset = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'last_month' | 'this_year' | 'custom'

export interface DateRangeFilter {
  preset?: DateRangePreset
  start_date?: string
  end_date?: string
}

// ============================================================================
// USER GROWTH ANALYTICS TYPES
// ============================================================================

export interface UserGrowthMetrics {
  date: string
  new_workers: number
  new_businesses: number
  total_new_users: number
  cumulative_users: number
  cumulative_workers: number
  cumulative_businesses: number
}

export interface UserGrowthSummary {
  total_users: number
  total_workers: number
  total_businesses: number
  new_users_today: number
  new_users_this_week: number
  new_users_this_month: number
  growth_rate_percentage: number
}

export interface DailyActiveUsers {
  date: string
  daily_active_users: number
}

export interface MonthlyActiveUsers {
  month: string
  monthly_active_users: number
}

// ============================================================================
// JOB COMPLETION ANALYTICS TYPES
// ============================================================================

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export interface JobCompletionMetrics {
  date: string
  total_jobs: number
  open_jobs: number
  in_progress_jobs: number
  completed_jobs: number
  cancelled_jobs: number
  completion_rate_percentage: number
  jobs_with_bookings: number
}

export interface JobCompletionSummary {
  total_jobs: number
  completed_jobs: number
  completion_rate_percentage: number
  avg_jobs_per_day: number
  most_active_day: string
}

// ============================================================================
// TRANSACTION VOLUME ANALYTICS TYPES
// ============================================================================

export type TransactionType = 'payment' | 'refund' | 'payout' | 'payout_failure'

export type TransactionStatus = 'pending' | 'success' | 'failed'

export interface TransactionVolumeMetrics {
  date: string
  total_transactions: number
  payment_count: number
  refund_count: number
  successful_transactions: number
  pending_transactions: number
  failed_transactions: number
  success_rate_percentage: number
  total_payment_volume: number
  total_refund_volume: number
  net_transaction_volume: number
  avg_payment_amount: number
  avg_refund_amount: number
}

export interface TransactionVolumeSummary {
  total_volume: number
  total_transactions: number
  success_rate_percentage: number
  avg_transaction_amount: number
  total_fees_collected: number
}

// ============================================================================
// GEOGRAPHIC DISTRIBUTION ANALYTICS TYPES
// ============================================================================

export interface GeographicDistribution {
  location_name: string
  worker_count: number
  job_count: number
  booking_count: number
  bookings_per_worker: number
  avg_lat: number
  avg_lng: number
}

export interface GeographicSummary {
  total_locations: number
  total_workers: number
  total_jobs: number
  top_location: string
  avg_bookings_per_worker: number
}

// ============================================================================
// TRENDING CATEGORIES ANALYTICS TYPES
// ============================================================================

export interface TrendingCategory {
  category_id: string
  category_name: string
  category_slug: string
  job_count: number
  booking_count: number
  demand_ratio: number
  avg_budget: number
  completion_rate_percentage: number
}

export interface TrendingCategoriesSummary {
  total_categories: number
  most_popular_category: string
  highest_demand_category: string
  avg_category_demand_ratio: number
}

// ============================================================================
// COMPLIANCE VIOLATIONS ANALYTICS TYPES
// ============================================================================

export type KycStatus = 'pending' | 'verified' | 'rejected'

export interface ComplianceMetrics {
  date: string
  total_kyc_submissions: number
  pending_verifications: number
  verified_workers: number
  rejected_verifications: number
  verification_success_rate: number
  rejection_rate_percentage: number
  avg_verification_hours: number
  workers_without_kyc: number
}

export interface ComplianceSummary {
  total_workers: number
  verified_workers: number
  pending_verifications: number
  rejected_verifications: number
  verification_success_rate: number
  workers_without_kyc: number
  avg_verification_time_hours: number
}

// ============================================================================
// REVENUE ANALYTICS TYPES
// ============================================================================

export interface RevenueMetrics {
  date: string
  successful_payments: number
  successful_refunds: number
  gross_revenue: number
  refunds_amount: number
  net_revenue: number
  avg_payment_amount: number
  platform_fee: number
  cumulative_platform_fee: number
}

export interface RevenueSummary {
  gross_revenue: number
  net_revenue: number
  total_platform_fees: number
  cumulative_platform_fees: number
  avg_daily_revenue: number
  revenue_growth_percentage: number
}

// ============================================================================
// BOOKING SUMMARY ANALYTICS TYPES
// ============================================================================

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'

export interface BookingMetrics {
  date: string
  total_bookings: number
  pending_bookings: number
  accepted_bookings: number
  rejected_bookings: number
  in_progress_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  acceptance_rate_percentage: number
  completion_rate_percentage: number
  avg_final_price: number
  total_earnings: number
}

export interface BookingSummary {
  total_bookings: number
  completed_bookings: number
  acceptance_rate_percentage: number
  completion_rate_percentage: number
  total_earnings: number
  avg_booking_value: number
}

// ============================================================================
// ANALYTICS DASHBOARD TYPES
// ============================================================================

export interface AnalyticsDashboardData {
  user_growth: {
    metrics: UserGrowthMetrics[]
    summary: UserGrowthSummary
    daily_active_users?: DailyActiveUsers[]
    monthly_active_users?: MonthlyActiveUsers[]
  }
  job_completion: {
    metrics: JobCompletionMetrics[]
    summary: JobCompletionSummary
  }
  transaction_volume: {
    metrics: TransactionVolumeMetrics[]
    summary: TransactionVolumeSummary
  }
  geographic_distribution: {
    data: GeographicDistribution[]
    summary: GeographicSummary
  }
  trending_categories: {
    data: TrendingCategory[]
    summary: TrendingCategoriesSummary
  }
  compliance: {
    metrics: ComplianceMetrics[]
    summary: ComplianceSummary
  }
  revenue: {
    metrics: RevenueMetrics[]
    summary: RevenueSummary
  }
  bookings: {
    metrics: BookingMetrics[]
    summary: BookingSummary
  }
}

export interface AnalyticsDashboardParams {
  date_range?: DateRangeFilter
}

export interface AnalyticsDashboardResponse {
  data: AnalyticsDashboardData
  date_range: DateRangeFilter
  generated_at: string
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ExportFormat = 'csv' | 'pdf'

export type ExportMetricType =
  | 'user_growth'
  | 'job_completion'
  | 'transaction_volume'
  | 'geographic_distribution'
  | 'trending_categories'
  | 'compliance'
  | 'revenue'
  | 'bookings'
  | 'all'

export interface ExportAnalyticsInput {
  metric_type: ExportMetricType
  format: ExportFormat
  date_range: DateRangeFilter
}

export interface ExportAnalyticsResponse {
  file_url: string
  file_name: string
  format: ExportFormat
  generated_at: string
}

// ============================================================================
// ANALYTICS QUERY PARAMS TYPES
// ============================================================================

export interface UserGrowthQueryParams {
  start_date?: string
  end_date?: string
}

export interface JobCompletionQueryParams {
  start_date?: string
  end_date?: string
}

export interface TransactionVolumeQueryParams {
  start_date?: string
  end_date?: string
}

export interface ComplianceQueryParams {
  start_date?: string
  end_date?: string
}

export interface RevenueQueryParams {
  start_date?: string
  end_date?: string
}

export interface BookingSummaryQueryParams {
  start_date?: string
  end_date?: string
}

// ============================================================================
// ANALYTICS ERROR TYPES
// ============================================================================

export type AnalyticsErrorCode =
  | 'PERMISSION_DENIED'
  | 'INVALID_DATE_RANGE'
  | 'DATA_UNAVAILABLE'
  | 'EXPORT_FAILED'
  | 'RATE_LIMIT_EXCEEDED'

export interface AnalyticsError {
  code: AnalyticsErrorCode
  message: string
  details?: Record<string, unknown>
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ANALYTICS_CONSTANTS = {
  DEFAULT_DATE_RANGE_DAYS: 30,
  MAX_DATE_RANGE_DAYS: 365,
  MIN_DATE_RANGE_DAYS: 1,
  PLATFORM_FEE_PERCENTAGE: 0.10,
  EXPORT_MAX_ROWS: 10000,
  REFRESH_INTERVAL_MS: 300000, // 5 minutes
} as const

// ============================================================================
// HELPER TYPES
// ============================================================================

export type MetricsByDate<T> = Array<T & { date: string }>

export interface ChartDataPoint {
  label: string
  value: number
  date?: string
}

export interface ChartDataset {
  label: string
  data: ChartDataPoint[]
  color?: string
}

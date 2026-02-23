import { Database } from '../supabase/types'

// Earnings Period Types
export type EarningsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all_time'

export type EarningsSortOrder = 'date_asc' | 'date_desc' | 'amount_asc' | 'amount_desc'

// Earnings Summary Types
export interface EarningsSummary {
  total_earnings: number
  current_month_earnings: number
  previous_month_earnings: number
  month_over_month_change: number // percentage
  total_bookings_completed: number
  average_earnings_per_booking: number
  currency: string
  period_start: string | null
  period_end: string | null
}

export interface EarningsSummaryRequest {
  worker_id: string
  period?: EarningsPeriod
  start_date?: string
  end_date?: string
}

// Monthly Earnings Types
export interface MonthlyEarnings {
  month: string // ISO month string (e.g., "2024-01")
  month_name: string // Display name (e.g., "January 2024")
  earnings: number
  bookings_count: number
  average_earning: number
}

export interface MonthlyEarningsRequest {
  worker_id: string
  months?: number // Number of months to include (default: 12)
  start_date?: string
  end_date?: string
}

export interface MonthlyEarningsResponse {
  data: MonthlyEarnings[]
  total_earnings: number
  total_bookings: number
  highest_earning_month: MonthlyEarnings | null
  lowest_earning_month: MonthlyEarnings | null
  average_monthly_earnings: number
}

// Earnings by Position Types
export interface PositionEarnings {
  position_title: string
  category_name: string | null
  total_earnings: number
  bookings_count: number
  average_earning: number
  highest_single_earning: number
  lowest_single_earning: number
  last_booking_date: string | null
}

export interface EarningsByPositionRequest {
  worker_id: string
  sort_by?: 'earnings' | 'bookings' | 'average'
  sort_order?: 'asc' | 'desc'
  limit?: number
}

export interface EarningsByPositionResponse {
  data: PositionEarnings[]
  best_performing_position: PositionEarnings | null
  total_positions: number
}

// Transaction History Types (Earnings-specific)
export type EarningsTransactionType = 'payment' | 'refund'

export type EarningsTransactionStatus = 'pending' | 'success' | 'failed'

export interface EarningsTransaction {
  id: string
  amount: number
  type: EarningsTransactionType
  status: EarningsTransactionStatus
  booking_id: string
  job_title: string
  business_name: string
  created_at: string
  completed_at: string | null
}

export interface EarningsTransactionHistoryRequest {
  worker_id: string
  type?: EarningsTransactionType
  status?: EarningsTransactionStatus
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
  sort_order?: EarningsSortOrder
}

export interface EarningsTransactionHistoryResponse {
  transactions: EarningsTransaction[]
  total: number
  page: number
  limit: number
  total_pages: number
  total_amount: number
}

// Projected Income Types
export interface IncomeProjection {
  period: 'week' | 'month' | 'quarter'
  projected_income: number
  confidence: 'low' | 'medium' | 'high'
  calculation_method: 'simple_average' | 'trend_based' | 'booking_based'
  factors: {
    recent_bookings_count: number
    average_earning_per_booking: number
    booking_frequency: number // bookings per week
    trend_percentage: number // positive for upward, negative for downward
  }
  calculated_at: string
}

export interface IncomeProjectionRequest {
  worker_id: string
  period: 'week' | 'month' | 'quarter'
  calculation_method?: 'simple_average' | 'trend_based' | 'booking_based'
}

// Export Types
export type ExportFormat = 'csv' | 'pdf'

export interface EarningsExportRequest {
  worker_id: string
  format: ExportFormat
  start_date?: string
  end_date?: string
  include_breakdown?: boolean // Include position breakdown
}

export interface EarningsExportResponse {
  download_url: string
  filename: string
  format: ExportFormat
  expires_at: string
  rows_count?: number
}

// Validation Types
export interface EarningsDateRangeValidationResult {
  valid: boolean
  error?: string
  max_date_range_days?: number
}

export interface EarningsExportValidationResult {
  valid: boolean
  error?: string
  max_export_rows?: number
  date_range_valid?: boolean
}

// Earnings Analytics Dashboard Types
export interface EarningsDashboardData {
  summary: EarningsSummary
  monthly_earnings: MonthlyEarnings[]
  earnings_by_position: PositionEarnings[]
  recent_transactions: EarningsTransaction[]
  projection: IncomeProjection | null
}

export interface EarningsDashboardRequest {
  worker_id: string
  months_to_display?: number
  include_projection?: boolean
  projection_period?: 'week' | 'month' | 'quarter'
}

// Constants
export const EARNINGS_CONSTANTS = {
  DEFAULT_MONTHS_TO_DISPLAY: 12,
  MIN_MONTHS_FOR_PROJECTION: 2,
  MAX_EXPORT_ROWS: 10000,
  MAX_DATE_RANGE_DAYS: 365,
  DEFAULT_TRANSACTION_LIMIT: 20,
  MAX_TRANSACTION_LIMIT: 100,
  LOW_CONFIDENCE_THRESHOLD: 3, // minimum bookings for low confidence
  MEDIUM_CONFIDENCE_THRESHOLD: 5, // minimum bookings for medium confidence
  HIGH_CONFIDENCE_THRESHOLD: 10, // minimum bookings for high confidence
} as const

// Helper Types
export type EarningsData =
  | EarningsSummary
  | MonthlyEarnings
  | PositionEarnings
  | EarningsTransaction
  | IncomeProjection

export interface EarningsQueryFilters {
  start_date?: string
  end_date?: string
  type?: EarningsTransactionType
  status?: EarningsTransactionStatus
  min_amount?: number
  max_amount?: number
}

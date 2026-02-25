import { Database } from '../supabase/types'

// ============================================
// ANALYTICS DATA TYPES
// ============================================

type BookingRow = Database['public']['Tables']['bookings']['Row']
type JobRow = Database['public']['Tables']['jobs']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']

// Position statistics for popular positions chart
type PositionStatsRow = {
  position: string
  count: number
  percentage: number
}

// Monthly hiring trends
type HiringTrendRow = {
  month: string
  year: number
  bookings_count: number
  unique_workers: number
  total_spending: number
}

// Worker reliability metrics
type WorkerReliabilityRow = {
  worker_id: string
  worker_name: string
  reliability_score: number
  total_bookings: number
  completed_bookings: number
  attendance_rate: number
  punctuality_rate: number
  average_rating: number | null
}

// Business spending summary
type SpendingSummaryRow = {
  business_id: string
  total_spending: number
  transaction_count: number
  successful_payments: number
  pending_payments: number
  failed_payments: number
}

// Compliance status for PP 35/2021
type ComplianceStatusRow = {
  is_compliant: boolean
  checked_at: string
  requirements: {
    has_valid_contract: boolean
    has_payment_proof: boolean
    has_attendance_records: boolean
  }
}

// Export data row for CSV
type AnalyticsExportRow = {
  date: string
  worker_name: string
  position: string
  amount: number
  status: string
  reliability_score: number
}

// ============================================
// EXPORTED TYPES
// ============================================

export type PositionStats = PositionStatsRow
export type HiringTrend = HiringTrendRow
export type WorkerReliability = WorkerReliabilityRow
export type SpendingSummary = SpendingSummaryRow
export type ComplianceStatus = ComplianceStatusRow
export type AnalyticsExportData = AnalyticsExportRow

// ============================================
// FILTER TYPES
// ============================================

export type DateRangePreset = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'

export type ChartType = 'spending' | 'positions' | 'reliability' | 'trends'

export interface AnalyticsFilters {
  dateRange?: DateRangePreset
  dateAfter?: string
  dateBefore?: string
  position?: string
  workerId?: string
  minReliabilityScore?: number
}

export interface DateRange {
  from: string
  to: string
  preset?: DateRangePreset
}

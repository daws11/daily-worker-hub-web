import { supabase } from '../client'
import type { Database } from '../types'

// Type for compliance_tracking record (not yet in generated types)
export interface ComplianceTrackingRow {
  id: string
  business_id: string
  worker_id: string
  month: string
  days_worked: number
  created_at: string
  updated_at: string
}

// Type for database function result
type CalculateDaysWorkedResult = {
  calculate_days_worked: number | null
}

/**
 * Get the number of days worked by a worker for a business in a specific month.
 * This function calls the database function calculate_days_worked which counts
 * accepted/completed bookings in the specified month.
 *
 * @param workerId - The worker ID
 * @param businessId - The business ID
 * @param month - First day of the month (e.g., '2026-02-01')
 * @returns The days worked count, or 0 if no record exists
 */
export async function getWorkerDaysForMonth(
  workerId: string,
  businessId: string,
  month: string
) {
  try {
    // Use type assertion to bypass missing type definitions for the database function
    // The function exists in the database and will work correctly at runtime
    const { data, error } = await (supabase.rpc as any)(
      'calculate_days_worked',
      {
        p_business_id: businessId,
        p_worker_id: workerId,
        p_month: month
      }
    )

    if (error) {
      console.error('Error calculating worker days for month:', error)
      return { data: null, error }
    }

    // The function returns an integer, default to 0 if null
    const daysWorked = (data as number | null) ?? 0
    return { data: daysWorked, error: null }
  } catch (error) {
    console.error('Unexpected error calculating worker days for month:', error)
    return { data: null, error }
  }
}

/**
 * Get all compliance records for a specific business.
 * Useful for auditing and displaying compliance history.
 *
 * @param businessId - The business ID
 * @param limit - Maximum number of records to return (default: 100)
 */
export async function getBusinessComplianceRecords(businessId: string, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('compliance_tracking')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('business_id', businessId)
      .order('month', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching business compliance records:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business compliance records:', error)
    return { data: null, error }
  }
}

/**
 * Get all compliance records for a specific worker.
 * Useful for workers to track their work history across businesses.
 *
 * @param workerId - The worker ID
 * @param limit - Maximum number of records to return (default: 100)
 */
export async function getWorkerComplianceRecords(workerId: string, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('compliance_tracking')
      .select(`
        *,
        business:businesses!inner(
          id,
          name
        )
      `)
      .eq('worker_id', workerId)
      .order('month', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching worker compliance records:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker compliance records:', error)
    return { data: null, error }
  }
}

// Type for compliance status result
export type ComplianceStatus = 'ok' | 'warning' | 'blocked'
export type WarningLevel = 'none' | 'approaching' | 'limit'

export interface ComplianceStatusResult {
  status: ComplianceStatus
  daysWorked: number
  warningLevel: WarningLevel
  message: string
}

/**
 * Get compliance status for a worker-business pair.
 * Checks if the worker can be booked based on PP 35/2021 compliance rules:
 * - Days 0-14: OK (can book)
 * - Days 15-20: Warning (approaching limit, can still book)
 * - Day 21+: Blocked (cannot book - PP 35/2021 limit)
 *
 * @param workerId - The worker ID
 * @param businessId - The business ID
 * @param month - First day of the month (e.g., '2026-02-01'). Defaults to current month
 * @returns Compliance status with days worked, status, warning level, and message
 */
export async function getComplianceStatus(
  workerId: string,
  businessId: string,
  month?: string
) {
  try {
    // Default to current month if not provided
    const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01'

    // Get days worked for the month
    const { data: daysWorked, error } = await getWorkerDaysForMonth(
      workerId,
      businessId,
      targetMonth
    )

    if (error) {
      console.error('Error fetching compliance status:', error)
      return { data: null, error }
    }

    const days = daysWorked ?? 0
    let status: ComplianceStatus = 'ok'
    let warningLevel: WarningLevel = 'none'
    let message = 'Worker can be booked'

    if (days >= 21) {
      status = 'blocked'
      warningLevel = 'limit'
      message = `Worker has reached ${days} days this month. PP 35/2021 limit (21 days) reached. Cannot accept more bookings.`
    } else if (days >= 15) {
      status = 'warning'
      warningLevel = 'approaching'
      message = `Warning: Worker has worked ${days} days this month. Approaching PP 35/2021 limit of 21 days.`
    }

    const result: ComplianceStatusResult = {
      status,
      daysWorked: days,
      warningLevel,
      message
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('Unexpected error fetching compliance status:', error)
    return { data: null, error }
  }
}

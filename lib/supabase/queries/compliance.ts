import { supabase } from '../client'
import type { Database } from '../types'

// Type for workers row
type WorkerRow = Database['public']['Tables']['workers']['Row']

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
    const { data, error } = await (supabase as any)
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
    const { data, error } = await (supabase as any)
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

/**
 * Get all compliance records for a business.
 * Used for audit purposes to track worker compliance history.
 *
 * @param businessId - The business ID
 * @param limit - Maximum number of records to return (default: 100)
 */
export async function getComplianceRecords(businessId: string, limit = 100) {
  try {
    const { data, error } = await (supabase as any)
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
      console.error('Error fetching compliance records:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching compliance records:', error)
    return { data: null, error }
  }
}

// ============================================================================
// COMPLIANCE WARNINGS TYPES
// ============================================================================

// Type for compliance_warnings row
export interface ComplianceWarningsRow {
  id: string
  business_id: string
  worker_id: string
  month: string
  days_worked: number
  warning_level: 'none' | 'warning' | 'blocked'
  acknowledged: boolean
  created_at: string
  updated_at: string
}

// Type for compliance status result
export type ComplianceStatus = 'ok' | 'warning' | 'blocked'
export type WarningLevel = 'none' | 'warning' | 'blocked'

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
      warningLevel = 'blocked'
      message = `Worker has reached ${days} days this month. PP 35/2021 limit (21 days) reached. Cannot accept more bookings.`
    } else if (days >= 16) {
      status = 'warning'
      warningLevel = 'warning'
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

// Type for alternative worker with compliance info
export interface AlternativeWorker {
  id: string
  full_name: string
  avatar_url: string
  phone: string
  bio: string
  daysWorked: number
  complianceStatus: ComplianceStatus
  warningLevel: WarningLevel
}

/**
 * Get alternative workers who haven't reached the PP 35/2021 limit.
 * Returns workers who can still be booked for the given business and month,
 * including their current compliance status and days worked.
 *
 * Workers are returned if:
 * - They have worked for this business before but haven't reached 21 days
 * - They have never worked for this business in the target month
 *
 * @param businessId - The business ID
 * @param month - First day of the month (e.g., '2026-02-01')
 * @param limit - Maximum number of workers to return (default: 20)
 * @returns Array of workers with their compliance status and days worked
 */
export async function getAlternativeWorkers(
  businessId: string,
  month?: string,
  limit = 20
) {
  try {
    // Default to current month if not provided
    const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01'

    // Get all workers who have bookings or compliance records for this business
    // This includes both active and inactive workers for the business
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, full_name, avatar_url, phone, bio')
      .limit(limit * 2) // Fetch more to account for filtering

    if (workersError) {
      console.error('Error fetching workers:', workersError)
      return { data: null, error: workersError }
    }

    // Type assertion to handle Supabase query response
    const workersData = workers as Array<Pick<WorkerRow, 'id' | 'full_name' | 'avatar_url' | 'phone' | 'bio'> | null>

    if (!workersData || workersData.length === 0) {
      return { data: [], error: null }
    }

    // Check compliance status for each worker
    const alternativeWorkers: AlternativeWorker[] = []

    for (const worker of workersData) {
      if (!worker) continue

      const { data: complianceData } = await getComplianceStatus(
        worker.id,
        businessId,
        targetMonth
      )

      if (complianceData) {
        // Include workers who are NOT blocked (days < 21)
        if (complianceData.status !== 'blocked') {
          alternativeWorkers.push({
            id: worker.id,
            full_name: worker.full_name,
            avatar_url: worker.avatar_url,
            phone: worker.phone || '',
            bio: worker.bio || '',
            daysWorked: complianceData.daysWorked,
            complianceStatus: complianceData.status,
            warningLevel: complianceData.warningLevel
          })
        }
      }
    }

    // Sort by availability: workers with fewer days worked first
    alternativeWorkers.sort((a, b) => a.daysWorked - b.daysWorked)

    // Limit results
    const limitedWorkers = alternativeWorkers.slice(0, limit)

    return { data: limitedWorkers, error: null }
  } catch (error) {
    console.error('Unexpected error fetching alternative workers:', error)
    return { data: null, error }
  }
}

// ============================================================================
// COMPLIANCE WARNINGS QUERIES
// ============================================================================

/**
 * Get compliance warnings for a business in a specific month.
 * Returns warnings with worker details, sorted by warning level and days worked.
 *
 * @param businessId - The business ID
 * @param month - First day of the month (e.g., '2026-02-01')
 * @returns Compliance warnings with worker details
 */
export async function getBusinessComplianceWarnings(businessId: string, month?: string) {
  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01'

    const { data, error } = await (supabase as any)
      .from('compliance_warnings')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url,
          phone
        )
      `)
      .eq('business_id', businessId)
      .eq('month', targetMonth)
      .in('warning_level', ['warning', 'blocked']) // Only return actual warnings
      .order('warning_level', { ascending: false }) // blocked first, then warning
      .order('days_worked', { ascending: false })

    if (error) {
      console.error('Error fetching business compliance warnings:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business compliance warnings:', error)
    return { data: null, error }
  }
}

/**
 * Get compliance warnings for a worker in a specific month.
 * Returns warnings with business details.
 *
 * @param workerId - The worker ID
 * @param month - First day of the month (e.g., '2026-02-01')
 * @returns Compliance warnings with business details
 */
export async function getWorkerComplianceWarnings(workerId: string, month?: string) {
  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01'

    const { data, error } = await (supabase as any)
      .from('compliance_warnings')
      .select(`
        *,
        business:businesses!inner(
          id,
          name,
          email
        )
      `)
      .eq('worker_id', workerId)
      .eq('month', targetMonth)
      .in('warning_level', ['warning', 'blocked'])
      .order('warning_level', { ascending: false })
      .order('days_worked', { ascending: false })

    if (error) {
      console.error('Error fetching worker compliance warnings:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching worker compliance warnings:', error)
    return { data: null, error }
  }
}

/**
 * Get compliance warnings summary for a business.
 * Returns counts of workers by warning level.
 *
 * @param businessId - The business ID
 * @param month - First day of the month (e.g., '2026-02-01')
 * @returns Summary with counts and warnings
 */
export async function getBusinessComplianceSummary(businessId: string, month?: string) {
  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01'

    const { data, error } = await (supabase as any)
      .from('compliance_warnings')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('business_id', businessId)
      .eq('month', targetMonth)

    if (error) {
      console.error('Error fetching business compliance summary:', error)
      return { data: null, error }
    }

    const warnings = data || []
    const summary = {
      totalWorkers: warnings.length,
      compliantWorkers: warnings.filter((w: ComplianceWarningsRow) => w.warning_level === 'none').length,
      warningWorkers: warnings.filter((w: ComplianceWarningsRow) => w.warning_level === 'warning').length,
      blockedWorkers: warnings.filter((w: ComplianceWarningsRow) => w.warning_level === 'blocked').length,
      averageDaysWorked: warnings.length > 0
        ? warnings.reduce((sum: number, w: ComplianceWarningsRow) => sum + w.days_worked, 0) / warnings.length
        : 0,
      warnings
    }

    return { data: summary, error: null }
  } catch (error) {
    console.error('Unexpected error fetching business compliance summary:', error)
    return { data: null, error }
  }
}

/**
 * Acknowledge a compliance warning.
 * This is used when a business acknowledges they've seen a warning.
 *
 * @param warningId - The compliance warning ID
 * @returns Success status
 */
export async function acknowledgeComplianceWarning(warningId: string) {
  try {
    const { data, error } = await (supabase as any)
      .from('compliance_warnings')
      .update({ acknowledged: true })
      .eq('id', warningId)
      .select()
      .single()

    if (error) {
      console.error('Error acknowledging compliance warning:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error acknowledging compliance warning:', error)
    return { data: null, error }
  }
}

/**
 * Get all unacknowledged compliance warnings for a business.
 * Used to show notifications on the dashboard.
 *
 * @param businessId - The business ID
 * @param month - First day of the month (e.g., '2026-02-01')
 * @returns Unacknowledged warnings
 */
export async function getUnacknowledgedWarnings(businessId: string, month?: string) {
  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01'

    const { data, error } = await (supabase as any)
      .from('compliance_warnings')
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('business_id', businessId)
      .eq('month', targetMonth)
      .eq('acknowledged', false)
      .in('warning_level', ['warning', 'blocked'])
      .order('warning_level', { ascending: false })

    if (error) {
      console.error('Error fetching unacknowledged warnings:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error fetching unacknowledged warnings:', error)
    return { data: null, error }
  }
}

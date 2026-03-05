"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { getComplianceStatus, type ComplianceStatusResult } from "../supabase/queries/compliance"

// ============================================================================
// TYPES
// ============================================================================

// Type for compliance check result
export type ComplianceCheckResult = {
  success: boolean
  canAccept: boolean
  error?: string
  data?: ComplianceStatusResult
  projectedDays?: number
  warningMessage?: string
}

// Type for worker compliance detail
export type WorkerComplianceDetail = {
  id: string
  worker_id: string
  worker_name: string
  business_id: string
  business_name: string
  month: string
  days_worked: number
  compliance_status: "ok" | "warning" | "blocked"
  acknowledged: boolean
  acknowledged_at?: string
  created_at: string
}

// Type for compliance overview
export type ComplianceOverview = {
  totalWorkers: number
  compliantWorkers: number
  warningWorkers: number
  blockedWorkers: number
  totalBusinesses: number
  month: string
  complianceRate: number
}

// Type for compliance enforcement result
export type ComplianceEnforcementResult = {
  allowed: boolean
  currentDays: number
  projectedDays: number
  status: "compliant" | "warning" | "blocked"
  message: string
  shouldShowWarning: boolean
  autoRejected: boolean
}

/**
 * Enhanced compliance check before accepting a booking.
 * Verifies PP 35/2021 compliance (21-day limit for daily workers).
 *
 * This action checks:
 * - Days worked by the worker for this business in the current month
 * - Returns ok (0-14 days), warning (15-20 days), or blocked (21+ days)
 * - Auto-rejects if limit would be exceeded
 *
 * @param workerId - The worker ID to check
 * @param businessId - The business ID
 * @param workDate - The proposed work date for the booking
 * @param month - Optional month to check (format: 'YYYY-MM-DD'). Defaults to current month.
 * @returns Compliance check result with enforcement status
 */
export async function checkComplianceBeforeAccept(
  workerId: string,
  businessId: string,
  workDate?: string,
  month?: string
): Promise<ComplianceCheckResult> {
  try {
    const supabase = await createClient()

    // Verify the business exists
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .single()

    if (businessError || !business) {
      return { success: false, canAccept: false, error: "Bisnis tidak ditemukan" }
    }

    // Verify the worker exists
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id")
      .eq("id", workerId)
      .single()

    if (workerError || !worker) {
      return { success: false, canAccept: false, error: "Pekerja tidak ditemukan" }
    }

    // Determine the month to check
    const targetMonth = month || (workDate
      ? workDate.slice(0, 7) + "-01"
      : new Date().toISOString().slice(0, 7) + "-01")

    // Get compliance status using the query function
    const { data: complianceData, error: complianceError } = await getComplianceStatus(
      workerId,
      businessId,
      targetMonth
    )

    if (complianceError || !complianceData) {
      return { success: false, canAccept: false, error: "Gagal mengecek status kepatuhan" }
    }

    // Calculate projected days if this booking is accepted
    const projectedDays = complianceData.daysWorked + 1

    // Determine if worker can be accepted based on compliance status
    let canAccept = true
    let warningMessage: string | undefined

    if (complianceData.status === "blocked") {
      // Already at or over limit - cannot accept
      canAccept = false
    } else if (complianceData.status === "warning") {
      // Approaching limit - can accept but show warning
      warningMessage = `Warning: Worker has worked ${complianceData.daysWorked} days. After this booking: ${projectedDays} days. PP 35/2021 limit is 21 days.`
    } else if (projectedDays > 21) {
      // This booking would exceed the limit
      canAccept = false
      warningMessage = "Accepting this booking would exceed the PP 35/2021 limit of 21 days per month."
    } else if (projectedDays >= 15) {
      // This booking brings worker to warning territory
      warningMessage = `After this booking, worker will have worked ${projectedDays} days this month. Approaching PP 35/2021 limit.`
    }

    return {
      success: true,
      canAccept,
      data: complianceData,
      projectedDays,
      warningMessage,
    }
  } catch (error) {
    console.error("Error checking compliance before accept:", error)
    return { success: false, canAccept: false, error: "Terjadi kesalahan saat mengecek kepatuhan" }
  }
}

/**
 * Enforce compliance when a booking is being accepted.
 * This is the gatekeeper function that should be called before any booking acceptance.
 *
 * @param workerId - The worker ID
 * @param businessId - The business ID
 * @param workDate - The work date for the booking
 * @returns Enforcement result with decision and messaging
 */
export async function enforceComplianceBeforeBooking(
  workerId: string,
  businessId: string,
  workDate: string
): Promise<ComplianceEnforcementResult> {
  try {
    const supabase = await createClient()

    // Use the database function to check compliance
    const { data: complianceCheck, error: checkError } = await (supabase as any).rpc(
      "check_booking_compliance",
      {
        p_business_id: businessId,
        p_worker_id: workerId,
        p_work_date: workDate,
      }
    )

    if (checkError) {
      console.error("Error checking booking compliance:", checkError)
      // On error, allow the booking but log the issue
      return {
        allowed: true,
        currentDays: 0,
        projectedDays: 1,
        status: "compliant",
        message: "Compliance check failed - allowing booking",
        shouldShowWarning: false,
        autoRejected: false,
      }
    }

    const result = complianceCheck?.[0] || complianceCheck

    return {
      allowed: result.allowed ?? true,
      currentDays: result.current_days ?? 0,
      projectedDays: result.projected_days ?? 1,
      status: result.status ?? "compliant",
      message: result.message ?? "",
      shouldShowWarning: result.status === "warning",
      autoRejected: !result.allowed,
    }
  } catch (error) {
    console.error("Error enforcing compliance:", error)
    // On error, allow the booking but log the issue
    return {
      allowed: true,
      currentDays: 0,
      projectedDays: 1,
      status: "compliant",
      message: "Compliance check error - allowing booking",
      shouldShowWarning: false,
      autoRejected: false,
    }
  }
}

/**
 * Get compliance records for a specific business.
 * Used for audit purposes to view all worker compliance history.
 *
 * @param businessId - The business ID
 * @param limit - Maximum number of records to return (default: 100)
 * @returns Compliance records for the business
 */
export async function getBusinessComplianceRecordsForAudit(
  businessId: string,
  limit = 100
) {
  try {
    const supabase = await createClient()

    // Verify the business exists
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .single()

    if (businessError || !business) {
      return { success: false, error: "Bisnis tidak ditemukan", data: null }
    }

    // Get compliance records
    const { data, error } = await (supabase as any)
      .from("compliance_tracking")
      .select(`
        *,
        worker:workers!inner(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("business_id", businessId)
      .order("month", { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: `Gagal mengambil data kepatuhan: ${error.message}`, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil data kepatuhan", data: null }
  }
}

/**
 * Create or update compliance tracking for a worker-business pair.
 * Called after a booking is accepted to update days worked.
 *
 * @param workerId - The worker ID
 * @param businessId - The business ID
 * @param month - The month (YYYY-MM-01 format)
 * @returns Success status
 */
export async function updateComplianceTracking(
  workerId: string,
  businessId: string,
  month?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01"

    const { error } = await (supabase as any).rpc("update_compliance_tracking", {
      p_business_id: businessId,
      p_worker_id: workerId,
      p_month: targetMonth,
    })

    if (error) {
      console.error("Error updating compliance tracking:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating compliance tracking:", error)
    return { success: false, error: "Failed to update compliance tracking" }
  }
}

/**
 * Acknowledge a compliance warning.
 * Marks that the business has seen and acknowledged the warning.
 *
 * @param warningId - The warning ID to acknowledge
 * @param acknowledgedBy - The user ID who acknowledged
 * @returns Success status
 */
export async function acknowledgeComplianceWarning(
  warningId: string,
  acknowledgedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await (supabase as any)
      .from("compliance_warnings")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy || null,
      })
      .eq("id", warningId)

    if (error) {
      console.error("Error acknowledging warning:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error acknowledging warning:", error)
    return { success: false, error: "Failed to acknowledge warning" }
  }
}

/**
 * Get all compliance warnings for admin dashboard.
 *
 * @param month - The month to get warnings for (YYYY-MM-01 format)
 * @param limit - Maximum number of warnings to return
 * @returns List of compliance warnings
 */
export async function getAllComplianceWarnings(
  month?: string,
  limit: number = 50
): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01"

    const { data, error } = await (supabase as any).rpc("get_all_compliance_warnings_admin", {
      p_month: targetMonth,
      p_limit: limit,
    })

    if (error) {
      console.error("Error getting compliance warnings:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Error getting compliance warnings:", error)
    return { data: null, error: "Failed to get compliance warnings" }
  }
}

/**
 * Get compliance summary for a business.
 *
 * @param businessId - The business ID
 * @param month - The month to get summary for
 * @returns Compliance summary
 */
export async function getBusinessComplianceSummary(
  businessId: string,
  month?: string
): Promise<{ data: any | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01"

    const { data, error } = await (supabase as any).rpc("get_business_compliance_summary", {
      p_business_id: businessId,
      p_month: targetMonth,
    })

    if (error) {
      console.error("Error getting business compliance summary:", error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Error getting business compliance summary:", error)
    return { data: null, error: "Failed to get business compliance summary" }
  }
}

/**
 * Get compliance status for multiple workers at once.
 * Useful for displaying compliance status in lists.
 *
 * @param workerIds - Array of worker IDs
 * @param businessId - The business ID
 * @param month - The month to check
 * @returns Map of worker ID to compliance status
 */
export async function getBatchComplianceStatus(
  workerIds: string[],
  businessId: string,
  month?: string
): Promise<{ data: Record<string, ComplianceStatusResult> | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01"

    // Get compliance tracking for all workers
    const { data: trackingData, error: trackingError } = await (supabase as any)
      .from("compliance_tracking")
      .select("worker_id, days_worked, compliance_status")
      .eq("business_id", businessId)
      .eq("month", targetMonth)
      .in("worker_id", workerIds)

    if (trackingError) {
      console.error("Error getting batch compliance status:", trackingError)
      return { data: null, error: trackingError.message }
    }

    // Build result map
    const result: Record<string, ComplianceStatusResult> = {}

    // Initialize all workers as compliant with 0 days
    workerIds.forEach((id) => {
      result[id] = {
        status: "ok",
        daysWorked: 0,
        warningLevel: "none",
        message: "Worker is compliant. 0 days worked this month.",
      }
    })

    // Update with actual data
    trackingData?.forEach((t: any) => {
      const status: "ok" | "warning" | "blocked" =
        t.compliance_status === "blocked"
          ? "blocked"
          : t.compliance_status === "warning"
          ? "warning"
          : "ok"

      result[t.worker_id] = {
        status,
        daysWorked: t.days_worked,
        warningLevel: t.compliance_status,
        message:
          status === "blocked"
            ? `Worker has reached ${t.days_worked} days. PP 35/2021 limit reached.`
            : status === "warning"
            ? `Warning: Worker has worked ${t.days_worked} days. Approaching PP 35/2021 limit.`
            : `Worker is compliant. ${t.days_worked} days worked this month.`,
      }
    })

    return { data: result, error: null }
  } catch (error) {
    console.error("Error getting batch compliance status:", error)
    return { data: null, error: "Failed to get batch compliance status" }
  }
}

/**
 * Check if a booking should be auto-rejected based on compliance.
 * This is a strict check that should be used before booking creation.
 *
 * @param workerId - The worker ID
 * @param businessId - The business ID
 * @param workDate - The work date
 * @returns Whether to auto-reject and reason
 */
export async function shouldAutoRejectBooking(
  workerId: string,
  businessId: string,
  workDate: string
): Promise<{ reject: boolean; reason?: string; currentDays?: number }> {
  try {
    const enforcement = await enforceComplianceBeforeBooking(workerId, businessId, workDate)

    if (enforcement.autoRejected) {
      return {
        reject: true,
        reason: enforcement.message,
        currentDays: enforcement.currentDays,
      }
    }

    return { reject: false, currentDays: enforcement.currentDays }
  } catch (error) {
    console.error("Error checking auto-reject:", error)
    // On error, don't reject
    return { reject: false }
  }
}

/**
 * Get compliance overview for admin dashboard.
 * Aggregates compliance data across all workers and businesses.
 *
 * @param month - The month to get overview for (YYYY-MM-01 format)
 * @returns Compliance overview with statistics
 */
export async function getComplianceOverview(
  month?: string
): Promise<{ data: ComplianceOverview | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01"

    // Get all compliance tracking records for the month
    const { data: trackingData, error: trackingError } = await (supabase as any)
      .from("compliance_tracking")
      .select(`
        id,
        worker_id,
        business_id,
        days_worked,
        compliance_status,
        month,
        workers!inner(full_name),
        businesses!inner(name)
      `)
      .eq("month", targetMonth)

    if (trackingError) {
      console.error("Error getting compliance overview:", trackingError)
      return { data: null, error: trackingError.message }
    }

    // Calculate statistics
    const totalWorkers = trackingData?.length || 0
    const compliantWorkers = trackingData?.filter((t: any) => t.compliance_status === "ok").length || 0
    const warningWorkers = trackingData?.filter((t: any) => t.compliance_status === "warning").length || 0
    const blockedWorkers = trackingData?.filter((t: any) => t.compliance_status === "blocked").length || 0

    // Get unique businesses
    const uniqueBusinesses = new Set(trackingData?.map((t: any) => t.business_id) || [])
    const totalBusinesses = uniqueBusinesses.size

    // Calculate compliance rate
    const complianceRate = totalWorkers > 0
      ? Math.round((compliantWorkers / totalWorkers) * 100)
      : 100

    return {
      data: {
        totalWorkers,
        compliantWorkers,
        warningWorkers,
        blockedWorkers,
        totalBusinesses,
        month: targetMonth,
        complianceRate,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error getting compliance overview:", error)
    return { data: null, error: "Failed to get compliance overview" }
  }
}

/**
 * Get compliance warnings list for admin dashboard.
 *
 * @param month - The month to get warnings for (YYYY-MM-01 format)
 * @param limit - Maximum number of records to return
 * @returns List of workers with compliance warnings
 */
export async function getComplianceWarningsList(
  month?: string,
  limit: number = 100
): Promise<{ data: WorkerComplianceDetail[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01"

    // Get compliance tracking records with warning or blocked status
    const { data: trackingData, error: trackingError } = await (supabase as any)
      .from("compliance_tracking")
      .select(`
        id,
        worker_id,
        business_id,
        days_worked,
        compliance_status,
        month,
        acknowledged,
        acknowledged_at,
        created_at,
        workers!inner(id, full_name),
        businesses!inner(id, name)
      `)
      .eq("month", targetMonth)
      .in("compliance_status", ["warning", "blocked"])
      .order("days_worked", { ascending: false })
      .limit(limit)

    if (trackingError) {
      console.error("Error getting compliance warnings list:", trackingError)
      return { data: null, error: trackingError.message }
    }

    // Transform data
    const warnings: WorkerComplianceDetail[] = (trackingData || []).map((t: any) => ({
      id: t.id,
      worker_id: t.worker_id,
      worker_name: t.workers?.full_name || "Unknown",
      business_id: t.business_id,
      business_name: t.businesses?.name || "Unknown",
      month: t.month,
      days_worked: t.days_worked,
      compliance_status: t.compliance_status,
      acknowledged: t.acknowledged || false,
      acknowledged_at: t.acknowledged_at,
      created_at: t.created_at,
    }))

    return { data: warnings, error: null }
  } catch (error) {
    console.error("Error getting compliance warnings list:", error)
    return { data: null, error: "Failed to get compliance warnings list" }
  }
}

/**
 * Export compliance data as CSV.
 *
 * @param month - The month to export (YYYY-MM-01 format)
 * @returns CSV string with compliance data
 */
export async function exportComplianceCsv(
  month?: string
): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01"

    // Get all compliance tracking records for the month
    const { data: trackingData, error: trackingError } = await (supabase as any)
      .from("compliance_tracking")
      .select(`
        worker_id,
        business_id,
        days_worked,
        compliance_status,
        month,
        workers!inner(full_name),
        businesses!inner(name)
      `)
      .eq("month", targetMonth)
      .order("days_worked", { ascending: false })

    if (trackingError) {
      console.error("Error exporting compliance data:", trackingError)
      return { data: null, error: trackingError.message }
    }

    // Generate CSV
    const headers = [
      "Worker ID",
      "Worker Name",
      "Business ID",
      "Business Name",
      "Month",
      "Days Worked",
      "Compliance Status",
    ]

    const rows = (trackingData || []).map((t: any) => [
      t.worker_id,
      t.workers?.full_name || "Unknown",
      t.business_id,
      t.businesses?.name || "Unknown",
      t.month,
      t.days_worked,
      t.compliance_status,
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n")

    return { data: csv, error: null }
  } catch (error) {
    console.error("Error exporting compliance CSV:", error)
    return { data: null, error: "Failed to export compliance CSV" }
  }
}

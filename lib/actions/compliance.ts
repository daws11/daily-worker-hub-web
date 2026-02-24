"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"
import { getComplianceStatus, type ComplianceStatusResult } from "../supabase/queries/compliance"

// Type for compliance check result
export type ComplianceCheckResult = {
  success: boolean
  canAccept: boolean
  error?: string
  data?: ComplianceStatusResult
}

/**
 * Check if a worker can be accepted before booking.
 * Verifies PP 35/2021 compliance (21-day limit for daily workers).
 *
 * This action checks:
 * - Days worked by the worker for this business in the current month
 * - Returns ok (0-14 days), warning (15-20 days), or blocked (21+ days)
 *
 * @param workerId - The worker ID to check
 * @param businessId - The business ID
 * @param month - Optional month to check (format: 'YYYY-MM-DD'). Defaults to current month.
 * @returns Compliance check result with status, days worked, and whether worker can be accepted
 */
export async function checkComplianceBeforeAccept(
  workerId: string,
  businessId: string,
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

    // Get compliance status using the query function
    const { data: complianceData, error: complianceError } = await getComplianceStatus(
      workerId,
      businessId,
      month
    )

    if (complianceError || !complianceData) {
      return { success: false, canAccept: false, error: "Gagal mengecek status kepatuhan" }
    }

    // Determine if worker can be accepted based on compliance status
    const canAccept = complianceData.status !== "blocked"

    return {
      success: true,
      canAccept,
      data: complianceData
    }
  } catch (error) {
    return { success: false, canAccept: false, error: "Terjadi kesalahan saat mengecek kepatuhan" }
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

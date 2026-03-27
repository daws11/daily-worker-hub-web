/**
 * Compliance Checker for 21 Days Rule (PP 35/2021)
 *
 * Indonesian labor law PP 35/2021 limits daily workers to 21 days per month
 * for the same business. This module provides utilities to check compliance,
 * determine warning levels, and suggest alternative workers.
 */

import {
  getComplianceStatus as getComplianceStatusFromDB,
  getAlternativeWorkers as getAlternativeWorkersFromDB,
  type ComplianceStatusResult,
  type WarningLevel,
} from "@/lib/supabase/queries/compliance";

// ============================================================================
// Types
// ============================================================================

/**
 * Compliance status based on days worked
 */
export type ComplianceStatus = "ok" | "warning" | "blocked";

/**
 * Detailed compliance check result
 */
export interface ComplianceCheckResult {
  canBook: boolean;
  status: ComplianceStatus;
  warningLevel: WarningLevel;
  daysWorked: number;
  daysRemaining: number;
  message: string;
  bannerType: "success" | "warning-yellow" | "warning-orange" | "error";
}

/**
 * Alternative worker with compliance info
 */
export interface AlternativeWorker {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  bio: string;
  daysWorked: number;
  complianceStatus: ComplianceStatus;
  warningLevel: WarningLevel;
  matchingScore?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * PP 35/2021 Compliance Thresholds for Daily Workers
 *
 * Indonesian labor law PP 35/2021 limits daily workers to 21 days per month
 * for the same business. Thresholds define warning levels to guide booking
 * decisions before the legal limit is reached.
 *
 * Rules:
 * - 0-15 days: OK (green) — can book freely
 * - 16-18 days: Warning (yellow) — booking allowed, advisory shown
 * - 19-20 days: Strong warning (orange) — booking allowed, strong advisory shown
 * - 21+ days: Blocked (red) — booking prohibited
 */

/**
 * Maximum working days per month per business per worker (PP 35/2021 limit).
 * Workers who reach this count cannot be booked for additional days with the same business.
 */
const MAX_DAYS_PER_MONTH = 21;

/**
 * Warning threshold — days 16 to MAX_DAYS_PER_MONTH - 2.
 * Workers who have worked WARNING_THRESHOLD or more days receive a yellow warning banner.
 * Booking is still permitted but the advisory message is shown.
 */
const WARNING_THRESHOLD = 16;

/**
 * Strong warning threshold — days 19 to MAX_DAYS_PER_MONTH - 2.
 * Workers who have worked STRONG_WARNING_THRESHOLD or more days receive an orange warning banner.
 * Booking is still permitted but a strong advisory message is shown.
 */
const STRONG_WARNING_THRESHOLD = 19;

/**
 * Block threshold — MAX_DAYS_PER_MONTH and above.
 * Workers who have worked BLOCK_THRESHOLD or more days are blocked from booking.
 * The worker cannot be hired for additional days with the same business this month.
 */
const BLOCK_THRESHOLD = 21;

// ============================================================================
// Compliance Check Functions
// ============================================================================

/**
 * Check if a worker can be booked for a business based on PP 35/2021 compliance.
 *
 * Rules:
 * - 0-15 days: OK (can book)
 * - 16-18 days: Warning (yellow banner, can still book)
 * - 19-20 days: Strong warning (orange banner, can still book)
 * - 21+ days: Blocked (red banner, cannot hire)
 *
 * @param workerId - The worker ID
 * @param businessId - The business ID
 * @param month - Optional month to check (format: 'YYYY-MM-DD'). Defaults to current month.
 * @returns Compliance check result with booking permission, warning level, and message
 */
export async function checkCompliance(
  workerId: string,
  businessId: string,
  month?: string,
): Promise<ComplianceCheckResult> {
  try {
    // Get compliance status from database
    const result = await getComplianceStatusFromDB(workerId, businessId, month);

    if (result.error || !result.data) {
      // On error, default to safe state (allow booking)
      console.error("Error checking compliance:", result.error);
      return {
        canBook: true,
        status: "ok",
        warningLevel: "none",
        daysWorked: 0,
        daysRemaining: MAX_DAYS_PER_MONTH,
        message: "Gagal mengecek status kepatuhan. Silakan coba lagi.",
        bannerType: "warning-yellow",
      };
    }

    const daysWorked = result.data.daysWorked;
    const daysRemaining = Math.max(0, MAX_DAYS_PER_MONTH - daysWorked);

    // Determine compliance status and warning level
    if (daysWorked >= BLOCK_THRESHOLD) {
      // 21+ days: Blocked
      return {
        canBook: false,
        status: "blocked",
        warningLevel: "blocked",
        daysWorked,
        daysRemaining: 0,
        message: `Pekerja telah mencapai batas ${daysWorked} hari bulan ini. PP 35/2021 membatasi pekerja harian maksimal 21 hari/bulan per bisnis. Tidak dapat menerima lebih banyak booking bulan ini.`,
        bannerType: "error",
      };
    } else if (daysWorked >= STRONG_WARNING_THRESHOLD) {
      // 19-20 days: Strong warning (orange)
      return {
        canBook: true,
        status: "warning",
        warningLevel: "warning",
        daysWorked,
        daysRemaining,
        message: `Peringatan kuat: Pekerja telah bekerja ${daysWorked} hari bulan ini. Hanya tersisa ${daysRemaining} hari sebelum mencapai batas PP 35/2021 (21 hari). Pertimbangkan pekerja alternatif.`,
        bannerType: "warning-orange",
      };
    } else if (daysWorked >= WARNING_THRESHOLD) {
      // 16-18 days: Warning (yellow)
      return {
        canBook: true,
        status: "warning",
        warningLevel: "warning",
        daysWorked,
        daysRemaining,
        message: `Peringatan: Pekerja telah bekerja ${daysWorked} hari bulan ini. Menjelang batas PP 35/2021 (21 hari). Tersisa ${daysRemaining} hari.`,
        bannerType: "warning-yellow",
      };
    } else {
      // 0-15 days: OK
      return {
        canBook: true,
        status: "ok",
        warningLevel: "none",
        daysWorked,
        daysRemaining,
        message: `Pekerja dapat di-booking. Telah bekerja ${daysWorked} dari 21 hari maksimal bulan ini.`,
        bannerType: "success",
      };
    }
  } catch (error) {
    console.error("Unexpected error checking compliance:", error);
    return {
      canBook: true,
      status: "ok",
      warningLevel: "none",
      daysWorked: 0,
      daysRemaining: MAX_DAYS_PER_MONTH,
      message: "Terjadi kesalahan. Silakan coba lagi.",
      bannerType: "warning-yellow",
    };
  }
}

/**
 * Check compliance for multiple workers at once (batch check).
 * Useful for job posting forms to show compliance status for all matched workers.
 *
 * @param workers - Array of worker IDs
 * @param businessId - The business ID
 * @param month - Optional month to check (format: 'YYYY-MM-DD')
 * @returns Map of worker ID to compliance check result
 */
export async function batchCheckCompliance(
  workers: string[],
  businessId: string,
  month?: string,
): Promise<Map<string, ComplianceCheckResult>> {
  const results = new Map<string, ComplianceCheckResult>();

  // Check compliance for each worker in parallel
  const checks = workers.map(async (workerId) => {
    const result = await checkCompliance(workerId, businessId, month);
    return { workerId, result };
  });

  const completedChecks = await Promise.all(checks);
  completedChecks.forEach(({ workerId, result }) => {
    results.set(workerId, result);
  });

  return results;
}

// ============================================================================
// Alternative Workers Functions
// ============================================================================

/**
 * Get alternative workers who haven't reached the PP 35/2021 limit.
 * Returns workers who can still be booked for the given business and month.
 *
 * Workers are sorted by:
 * 1. Days worked (fewest days first)
 * 2. Matching score (highest first, if available)
 *
 * @param businessId - The business ID
 * @param month - Optional month to check (format: 'YYYY-MM-DD')
 * @param excludeWorkerIds - Optional array of worker IDs to exclude
 * @param limit - Maximum number of workers to return (default: 20)
 * @returns Array of alternative workers with compliance status
 */
export async function getCompliantAlternativeWorkers(
  businessId: string,
  month?: string,
  excludeWorkerIds: string[] = [],
  limit = 20,
): Promise<AlternativeWorker[]> {
  try {
    // Get all alternative workers from database
    const { data: workers, error } = await getAlternativeWorkersFromDB(
      businessId,
      month,
      limit + excludeWorkerIds.length,
    );

    if (error || !workers) {
      console.error("Error fetching alternative workers:", error);
      return [];
    }

    // Filter out excluded workers
    const filteredWorkers = workers.filter(
      (worker) => !excludeWorkerIds.includes(worker.id),
    );

    // Convert to AlternativeWorker format
    const alternatives: AlternativeWorker[] = filteredWorkers.map((worker) => ({
      id: worker.id,
      full_name: worker.full_name,
      avatar_url: worker.avatar_url,
      phone: worker.phone,
      bio: worker.bio,
      daysWorked: worker.daysWorked,
      complianceStatus: worker.complianceStatus,
      warningLevel: worker.warningLevel,
      matchingScore: undefined, // Could be added from matching algorithm
    }));

    // Sort by days worked (fewest first), then by status priority
    alternatives.sort((a, b) => {
      // Priority: ok > warning (daysWorked as tiebreaker)
      if (a.complianceStatus !== b.complianceStatus) {
        const statusPriority = { ok: 0, warning: 1, blocked: 2 };
        return (
          statusPriority[a.complianceStatus] -
          statusPriority[b.complianceStatus]
        );
      }
      return a.daysWorked - b.daysWorked;
    });

    // Limit results
    return alternatives.slice(0, limit);
  } catch (error) {
    console.error("Unexpected error fetching alternative workers:", error);
    return [];
  }
}

// ============================================================================
// Worker Application Blocking
// ============================================================================

/**
 * Check if a worker can apply for a job based on PP 35/2021 compliance.
 * This is called before a worker applies to a job to prevent violations.
 *
 * @param workerId - The worker ID
 * @param businessId - The business ID (from the job)
 * @param month - Optional month to check (format: 'YYYY-MM-DD')
 * @returns Compliance check result with canBook flag
 */
export async function checkWorkerCanApply(
  workerId: string,
  businessId: string,
  month?: string,
): Promise<{ canApply: boolean; reason?: string }> {
  const compliance = await checkCompliance(workerId, businessId, month);

  if (!compliance.canBook) {
    return {
      canApply: false,
      reason: compliance.message,
    };
  }

  return {
    canApply: true,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the warning level based on days worked.
 *
 * @param daysWorked - Number of days worked in the month
 * @returns Warning level: 'none', 'warning', or 'blocked'
 */
export function getWarningLevel(
  daysWorked: number,
): "none" | "warning" | "blocked" {
  if (daysWorked >= BLOCK_THRESHOLD) {
    return "blocked";
  } else if (daysWorked >= WARNING_THRESHOLD) {
    return "warning";
  }
  return "none";
}

/**
 * Get the compliance status based on days worked.
 *
 * @param daysWorked - Number of days worked in the month
 * @returns Compliance status: 'ok', 'warning', or 'blocked'
 */
export function getComplianceStatus(daysWorked: number): ComplianceStatus {
  if (daysWorked >= BLOCK_THRESHOLD) {
    return "blocked";
  } else if (daysWorked >= WARNING_THRESHOLD) {
    return "warning";
  }
  return "ok";
}

/**
 * Get the banner type based on days worked.
 *
 * @param daysWorked - Number of days worked in the month
 * @returns Banner type: 'success', 'warning-yellow', 'warning-orange', or 'error'
 */
export function getBannerType(
  daysWorked: number,
): ComplianceCheckResult["bannerType"] {
  if (daysWorked >= BLOCK_THRESHOLD) {
    return "error";
  } else if (daysWorked >= STRONG_WARNING_THRESHOLD) {
    return "warning-orange";
  } else if (daysWorked >= WARNING_THRESHOLD) {
    return "warning-yellow";
  }
  return "success";
}

/**
 * Get user-friendly message for compliance status.
 *
 * @param daysWorked - Number of days worked in the month
 * @param isBusiness - True if the message is for a business, false for a worker
 * @returns User-friendly message
 */
export function getComplianceMessage(
  daysWorked: number,
  isBusiness: boolean = true,
): string {
  const daysRemaining = Math.max(0, MAX_DAYS_PER_MONTH - daysWorked);

  if (daysWorked >= BLOCK_THRESHOLD) {
    return isBusiness
      ? `Pekerja telah mencapai batas ${daysWorked} hari bulan ini. PP 35/2021 membatasi pekerja harian maksimal 21 hari/bulan per bisnis. Tidak dapat menerima lebih banyak booking bulan ini.`
      : `Anda telah mencapai batas ${daysWorked} hari bulan ini dengan bisnis ini. PP 35/2021 membatasi pekerja harian maksimal 21 hari/bulan per bisnis.`;
  } else if (daysWorked >= STRONG_WARNING_THRESHOLD) {
    return isBusiness
      ? `Peringatan kuat: Pekerja telah bekerja ${daysWorked} hari bulan ini. Hanya tersisa ${daysRemaining} hari sebelum mencapai batas PP 35/2021 (21 hari). Pertimbangkan pekerja alternatif.`
      : `Peringatan kuat: Anda telah bekerja ${daysWorked} hari bulan ini dengan bisnis ini. Hanya tersisa ${daysRemaining} hari sebelum mencapai batas PP 35/2021 (21 hari).`;
  } else if (daysWorked >= WARNING_THRESHOLD) {
    return isBusiness
      ? `Peringatan: Pekerja telah bekerja ${daysWorked} hari bulan ini. Menjelang batas PP 35/2021 (21 hari). Tersisa ${daysRemaining} hari.`
      : `Peringatan: Anda telah bekerja ${daysWorked} hari bulan ini dengan bisnis ini. Menjelang batas PP 35/2021 (21 hari).`;
  } else {
    return isBusiness
      ? `Pekerja dapat di-booking. Telah bekerja ${daysWorked} dari 21 hari maksimal bulan ini.`
      : `Anda dapat melamar pekerjaan. Telah bekerja ${daysWorked} dari 21 hari maksimal bulan ini dengan bisnis ini.`;
  }
}

/**
 * Calculate remaining days before blocking.
 *
 * @param daysWorked - Number of days worked in the month
 * @returns Number of remaining days before blocking (0 if already blocked)
 */
export function getRemainingDays(daysWorked: number): number {
  return Math.max(0, MAX_DAYS_PER_MONTH - daysWorked);
}

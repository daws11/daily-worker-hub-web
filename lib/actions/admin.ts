"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";

// Re-export admin analytics types and functions for backward compatibility
export {
  getRevenueMetrics,
  getWorkerStatistics,
  getBookingTrends,
  getPaymentMetrics,
} from "./admin-analytics";

export type {
  RevenueMetrics,
  WorkerStatistics,
  BookingTrends,
  PaymentMetrics,
} from "./admin-analytics";

// ============================================================================
// ADMIN EXPORT ACTIONS
// ============================================================================

export interface ExportBookingRow {
  booking_id: string;
  worker_name: string;
  worker_phone: string;
  business_name: string;
  job_title: string;
  start_date: string;
  status: string;
  total_amount: number;
  platform_fee: number;
  worker_payout: number;
  payment_status: string;
  created_at: string;
  completed_at: string | null;
}

/**
 * Export bookings data as CSV
 */
export async function exportBookingsCsv(
  startDate?: string,
  endDate?: string,
): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("bookings")
      .select(
        `
        id,
        start_date,
        status,
        total_amount,
        platform_fee,
        worker_payout,
        payment_status,
        created_at,
        completed_at,
        worker:workers(full_name, phone),
        business:businesses(name),
        job:jobs(title)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10000);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate + "T23:59:59");
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      return { data: null, error: bookingsError.message };
    }

    // Convert to CSV
    const headers = [
      "Booking ID",
      "Worker Name",
      "Worker Phone",
      "Business Name",
      "Job Title",
      "Work Date",
      "Status",
      "Total Amount",
      "Platform Fee",
      "Worker Payout",
      "Payment Status",
      "Created At",
      "Completed At",
    ];

    const rows = bookings?.map((b: any) => [
      b.id,
      b.worker?.full_name || "",
      b.worker?.phone || "",
      b.business?.name || "",
      b.job?.title || "",
      b.start_date || "",
      b.status || "",
      b.total_amount || 0,
      b.platform_fee || 0,
      b.worker_payout || 0,
      b.payment_status || "",
      b.created_at || "",
      b.completed_at || "",
    ]);

    const csv = [
      headers.join(","),
      ...(rows?.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ) || []),
    ].join("\n");

    return { data: csv, error: null };
  } catch (error) {
    console.error("Error exporting bookings:", error);
    return { data: null, error: "Failed to export bookings" };
  }
}

export interface ExportPaymentRow {
  transaction_id: string;
  booking_id: string;
  type: string;
  amount: number;
  status: string;
  worker_name: string | null;
  business_name: string | null;
  created_at: string;
  processed_at: string | null;
}

/**
 * Export payments data as CSV
 */
export async function exportPaymentsCsv(
  startDate?: string,
  endDate?: string,
): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Try transactions table first
    let query = supabase
      .from("transactions")
      .select(
        `
        id,
        booking_id,
        type,
        amount,
        status,
        created_at,
        processed_at,
        worker:workers(full_name),
        business:businesses(name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10000);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate + "T23:59:59");
    }

    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      // Fall back to bookings payment data
      let bookingQuery = supabase
        .from("bookings")
        .select(
          `
          id,
          total_amount,
          platform_fee,
          worker_payout,
          payment_status,
          created_at,
          completed_at,
          worker:workers(full_name),
          business:businesses(name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(10000);

      if (startDate) {
        bookingQuery = bookingQuery.gte("created_at", startDate);
      }
      if (endDate) {
        bookingQuery = bookingQuery.lte("created_at", endDate + "T23:59:59");
      }

      const { data: bookings, error: bookingsError } = await bookingQuery;

      if (bookingsError) {
        return { data: null, error: bookingsError.message };
      }

      const headers = [
        "Booking ID",
        "Type",
        "Amount",
        "Platform Fee",
        "Worker Payout",
        "Payment Status",
        "Worker Name",
        "Business Name",
        "Created At",
        "Completed At",
      ];

      const rows = bookings?.map((b: any) => [
        b.id,
        "booking_payment",
        b.total_amount || 0,
        b.platform_fee || 0,
        b.worker_payout || 0,
        b.payment_status || "",
        b.worker?.full_name || "",
        b.business?.name || "",
        b.created_at || "",
        b.completed_at || "",
      ]);

      const csv = [
        headers.join(","),
        ...(rows?.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        ) || []),
      ].join("\n");

      return { data: csv, error: null };
    }

    const headers = [
      "Transaction ID",
      "Booking ID",
      "Type",
      "Amount",
      "Status",
      "Worker Name",
      "Business Name",
      "Created At",
      "Processed At",
    ];

    const rows = transactions?.map((t: any) => [
      t.id,
      t.booking_id || "",
      t.type || "",
      t.amount || 0,
      t.status || "",
      t.worker?.full_name || "",
      t.business?.name || "",
      t.created_at || "",
      t.processed_at || "",
    ]);

    const csv = [
      headers.join(","),
      ...(rows?.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ) || []),
    ].join("\n");

    return { data: csv, error: null };
  } catch (error) {
    console.error("Error exporting payments:", error);
    return { data: null, error: "Failed to export payments" };
  }
}

export interface ExportComplianceRow {
  worker_id: string;
  worker_name: string;
  worker_phone: string;
  business_id: string;
  business_name: string;
  month: string;
  days_worked: number;
  compliance_status: string;
  warning_level: string;
  last_booking_date: string | null;
}

/**
 * Export compliance data as CSV
 */
export async function exportComplianceCsv(
  month?: string,
): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Get current month if not specified
    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01";

    const { data: complianceData, error: complianceError } = await (
      supabase as any
    )
      .from("compliance_tracking")
      .select(
        `
        id,
        worker_id,
        business_id,
        month,
        days_worked,
        compliance_status,
        last_booking_date,
        worker:workers(full_name, phone),
        business:businesses(name)
      `,
      )
      .eq("month", targetMonth)
      .order("days_worked", { ascending: false });

    if (complianceError) {
      return { data: null, error: complianceError.message };
    }

    // Get warning levels
    const { data: warningsData } = await (supabase as any)
      .from("compliance_warnings")
      .select("worker_id, business_id, month, warning_level")
      .eq("month", targetMonth);

    const warningMap = new Map<string, string>();
    warningsData?.forEach((w: any) => {
      warningMap.set(`${w.worker_id}-${w.business_id}`, w.warning_level);
    });

    const headers = [
      "Worker ID",
      "Worker Name",
      "Worker Phone",
      "Business ID",
      "Business Name",
      "Month",
      "Days Worked",
      "Compliance Status",
      "Warning Level",
      "Last Booking Date",
    ];

    const rows = complianceData?.map((c: any) => [
      c.worker_id || "",
      c.worker?.full_name || "",
      c.worker?.phone || "",
      c.business_id || "",
      c.business?.name || "",
      c.month || "",
      c.days_worked || 0,
      c.compliance_status || "",
      warningMap.get(`${c.worker_id}-${c.business_id}`) || "none",
      c.last_booking_date || "",
    ]);

    const csv = [
      headers.join(","),
      ...(rows?.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ) || []),
    ].join("\n");

    return { data: csv, error: null };
  } catch (error) {
    console.error("Error exporting compliance:", error);
    return { data: null, error: "Failed to export compliance data" };
  }
}

// ============================================================================
// ADMIN COMPLIANCE OVERVIEW ACTIONS
// ============================================================================

export interface ComplianceOverview {
  totalWorkers: number;
  compliantWorkers: number;
  warningWorkers: number;
  blockedWorkers: number;
  totalBusinesses: number;
  businessesWithWarnings: number;
  avgDaysWorked: number;
  month: string;
}

export interface WorkerComplianceDetail {
  workerId: string;
  workerName: string;
  workerPhone: string;
  businessId: string;
  businessName: string;
  daysWorked: number;
  complianceStatus: string;
  warningLevel: string;
  message: string;
  acknowledged: boolean;
}

/**
 * Get compliance overview for admin dashboard
 */
export async function getComplianceOverview(
  month?: string,
): Promise<{ data: ComplianceOverview | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01";

    // Get compliance summary using the database function
    const { data: summaryData, error: summaryError } = await (
      supabase as any
    ).rpc("get_all_compliance_summary", { p_month: targetMonth });

    if (summaryError) {
      // Fall back to direct queries
      const { data: trackingData, error: trackingError } = await (
        supabase as any
      )
        .from("compliance_tracking")
        .select("compliance_status, days_worked, business_id")
        .eq("month", targetMonth);

      if (trackingError) {
        return { data: null, error: trackingError.message };
      }

      const totalWorkers = trackingData?.length || 0;
      const compliantWorkers =
        trackingData?.filter((t: any) => t.compliance_status === "compliant")
          .length || 0;
      const warningWorkers =
        trackingData?.filter((t: any) => t.compliance_status === "warning")
          .length || 0;
      const blockedWorkers =
        trackingData?.filter((t: any) => t.compliance_status === "blocked")
          .length || 0;
      const businesses = new Set(trackingData?.map((t: any) => t.business_id));
      const totalDays =
        trackingData?.reduce(
          (sum: number, t: any) => sum + (t.days_worked || 0),
          0,
        ) || 0;

      return {
        data: {
          totalWorkers,
          compliantWorkers,
          warningWorkers,
          blockedWorkers,
          totalBusinesses: businesses.size,
          businessesWithWarnings: warningWorkers + blockedWorkers,
          avgDaysWorked: totalWorkers > 0 ? totalDays / totalWorkers : 0,
          month: targetMonth,
        },
        error: null,
      };
    }

    return { data: summaryData, error: null };
  } catch (error) {
    console.error("Error fetching compliance overview:", error);
    return { data: null, error: "Failed to fetch compliance overview" };
  }
}

/**
 * Get compliance warnings list for admin dashboard
 */
export async function getComplianceWarningsList(
  month?: string,
  limit: number = 50,
): Promise<{ data: WorkerComplianceDetail[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01";

    const { data: warningsData, error: warningsError } = await (supabase as any)
      .from("compliance_warnings")
      .select(
        `
        id,
        worker_id,
        business_id,
        month,
        days_worked,
        warning_level,
        message,
        acknowledged,
        worker:workers(full_name, phone),
        business:businesses(name)
      `,
      )
      .eq("month", targetMonth)
      .in("warning_level", ["warning", "blocked"])
      .order("warning_level", { ascending: false })
      .order("days_worked", { ascending: false })
      .limit(limit);

    if (warningsError) {
      return { data: null, error: warningsError.message };
    }

    const details: WorkerComplianceDetail[] = warningsData?.map((w: any) => ({
      workerId: w.worker_id,
      workerName: w.worker?.full_name || "Unknown",
      workerPhone: w.worker?.phone || "",
      businessId: w.business_id,
      businessName: w.business?.name || "Unknown",
      daysWorked: w.days_worked,
      complianceStatus: w.warning_level === "blocked" ? "blocked" : "warning",
      warningLevel: w.warning_level,
      message: w.message || "",
      acknowledged: w.acknowledged || false,
    }));

    return { data: details || [], error: null };
  } catch (error) {
    console.error("Error fetching compliance warnings:", error);
    return { data: null, error: "Failed to fetch compliance warnings" };
  }
}

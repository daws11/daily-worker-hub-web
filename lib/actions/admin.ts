"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";

// ============================================================================
<<<<<<< HEAD
=======
// ADMIN ANALYTICS ACTIONS
// ============================================================================

export interface RevenueMetrics {
  daily: {
    date: string;
    revenue: number;
    fees: number;
    bookings: number;
  }[];
  weekly: {
    week: string;
    revenue: number;
    fees: number;
    bookings: number;
  }[];
  monthly: {
    month: string;
    revenue: number;
    fees: number;
    bookings: number;
  }[];
  totals: {
    totalRevenue: number;
    totalFees: number;
    totalBookings: number;
    averagePerBooking: number;
  };
}

export interface WorkerStatistics {
  active: number;
  newThisMonth: number;
  byTier: {
    classic: number;
    pro: number;
    elite: number;
    champion: number;
  };
  byArea: {
    area: string;
    count: number;
  }[];
  byKycStatus: {
    verified: number;
    pending: number;
    unverified: number;
  };
}

export interface BookingTrends {
  daily: {
    date: string;
    created: number;
    completed: number;
    cancelled: number;
  }[];
  byStatus: {
    status: string;
    count: number;
  }[];
  byCategory: {
    category: string;
    count: number;
  }[];
}

export interface PaymentMetrics {
  successRate: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalVolume: number;
}

/**
 * Get revenue metrics for admin analytics dashboard.
 * Aggregates completed and in-progress bookings to calculate daily, weekly, and monthly revenue.
 * Defaults to the last 30 days if no date range is provided.
 *
 * @param startDate - Optional start date filter (YYYY-MM-DD format, defaults to 30 days ago)
 * @param endDate   - Optional end date filter (YYYY-MM-DD format, defaults to today)
 * @returns Result object containing revenue metrics (daily/weekly/monthly breakdowns and totals) or an error message
 */
export async function getRevenueMetrics(
  startDate?: string,
  endDate?: string,
): Promise<{ data: RevenueMetrics | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split("T")[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    // Get daily revenue from bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("created_at, final_price, status")
      .gte("created_at", start)
      .lte("created_at", end + "T23:59:59")
      .in("status", ["completed", "in_progress"]);

    if (bookingsError) {
      return { data: null, error: bookingsError.message };
    }

    // Calculate daily metrics
    const dailyMap = new Map<
      string,
      { revenue: number; fees: number; bookings: number }
    >();

    bookings?.forEach((booking) => {
      const date = booking.created_at.split("T")[0];
      const existing = dailyMap.get(date) || {
        revenue: 0,
        fees: 0,
        bookings: 0,
      };
      existing.revenue += Number(booking.final_price) || 0;
      // Platform fees not currently tracked in bookings table
      existing.fees += 0;
      existing.bookings += 1;
      dailyMap.set(date, existing);
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate weekly metrics
    const weeklyMap = new Map<
      string,
      { revenue: number; fees: number; bookings: number }
    >();
    daily.forEach((d) => {
      const date = new Date(d.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      const existing = weeklyMap.get(weekKey) || {
        revenue: 0,
        fees: 0,
        bookings: 0,
      };
      existing.revenue += d.revenue;
      existing.fees += d.fees;
      existing.bookings += d.bookings;
      weeklyMap.set(weekKey, existing);
    });

    const weekly = Array.from(weeklyMap.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Calculate monthly metrics
    const monthlyMap = new Map<
      string,
      { revenue: number; fees: number; bookings: number }
    >();
    daily.forEach((d) => {
      const monthKey = d.date.substring(0, 7) + "-01";
      const existing = monthlyMap.get(monthKey) || {
        revenue: 0,
        fees: 0,
        bookings: 0,
      };
      existing.revenue += d.revenue;
      existing.fees += d.fees;
      existing.bookings += d.bookings;
      monthlyMap.set(monthKey, existing);
    });

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals
    const totals = {
      totalRevenue: daily.reduce((sum, d) => sum + d.revenue, 0),
      totalFees: daily.reduce((sum, d) => sum + d.fees, 0),
      totalBookings: daily.reduce((sum, d) => sum + d.bookings, 0),
      averagePerBooking: 0,
    };
    totals.averagePerBooking =
      totals.totalBookings > 0 ? totals.totalRevenue / totals.totalBookings : 0;

    return {
      data: {
        daily,
        weekly,
        monthly,
        totals,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching revenue metrics:", error);
    return { data: null, error: "Failed to fetch revenue metrics" };
  }
}

/**
 * Get worker statistics for admin analytics dashboard.
 * Calculates active workers (those with bookings in the last 30 days), new workers this month,
 * and breakdowns by tier, area, and KYC status.
 *
 * @returns Result object containing worker statistics or an error message
 */
export async function getWorkerStatistics(): Promise<{
  data: WorkerStatistics | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Get total workers count
    const { count: totalWorkers, error: totalError } = await supabase
      .from("workers")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      return { data: null, error: totalError.message };
    }

    // Get active workers (with bookings in last 30 days)
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: activeWorkerIds, error: activeError } = await supabase
      .from("bookings")
      .select("worker_id")
      .gte("created_at", thirtyDaysAgo)
      .not("worker_id", "is", null);

    const activeCount = new Set(activeWorkerIds?.map((b) => b.worker_id)).size;

    // Get new workers this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count: newThisMonth, error: newError } = await supabase
      .from("workers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString());

    // Get workers by tier
    const { data: tierData, error: tierError } = await supabase
      .from("workers")
      .select("tier");

    const byTier = {
      classic:
        tierData?.filter(
          (w) =>
            w.tier ===
            ("classic" as Database["public"]["Enums"]["worker_tier"]),
        ).length || 0,
      pro:
        tierData?.filter(
          (w) =>
            w.tier === ("pro" as Database["public"]["Enums"]["worker_tier"]),
        ).length || 0,
      elite:
        tierData?.filter(
          (w) =>
            w.tier === ("elite" as Database["public"]["Enums"]["worker_tier"]),
        ).length || 0,
      champion:
        tierData?.filter(
          (w) =>
            w.tier ===
            ("champion" as Database["public"]["Enums"]["worker_tier"]),
        ).length || 0,
    };

    // Get workers by area
    const { data: areaData, error: areaError } = await supabase
      .from("workers")
      .select("location_name")
      .not("location_name", "is", null);

    const areaMap = new Map<string, number>();
    areaData?.forEach((w) => {
      if (w.location_name) {
        areaMap.set(w.location_name, (areaMap.get(w.location_name) || 0) + 1);
      }
    });

    const byArea = Array.from(areaMap.entries())
      .map(([location_name, count]) => ({ area: location_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get workers by KYC status
    const { data: kycData, error: kycError } = await supabase
      .from("workers")
      .select("kyc_status");

    const byKycStatus = {
      verified: kycData?.filter((w) => w.kyc_status === "approved").length || 0,
      pending:
        kycData?.filter(
          (w) => w.kyc_status === "pending" || w.kyc_status === "in_review",
        ).length || 0,
      unverified:
        kycData?.filter((w) => !w.kyc_status || w.kyc_status === "rejected")
          .length || 0,
    };

    return {
      data: {
        active: activeCount,
        newThisMonth: newThisMonth || 0,
        byTier,
        byArea,
        byKycStatus,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching worker statistics:", error);
    return { data: null, error: "Failed to fetch worker statistics" };
  }
}

/**
 * Get booking trends for admin analytics dashboard.
 * Tracks daily booking creation, completion, and cancellation rates, plus breakdowns by status and category.
 * Defaults to the last 30 days if no date range is provided.
 *
 * @param startDate - Optional start date filter (YYYY-MM-DD format, defaults to 30 days ago)
 * @param endDate   - Optional end date filter (YYYY-MM-DD format, defaults to today)
 * @returns Result object containing booking trend data (daily, by status, by category) or an error message
 */
export async function getBookingTrends(
  startDate?: string,
  endDate?: string,
): Promise<{ data: BookingTrends | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Default to last 30 days
    const end = endDate || new Date().toISOString().split("T")[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    // Get bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("created_at, status, job:jobs(category_id)")
      .gte("created_at", start)
      .lte("created_at", end + "T23:59:59");

    if (bookingsError) {
      return { data: null, error: bookingsError.message };
    }

    // Calculate daily trends
    const dailyMap = new Map<
      string,
      { created: number; completed: number; cancelled: number }
    >();

    bookings?.forEach((booking) => {
      const date = booking.created_at.split("T")[0];
      const existing = dailyMap.get(date) || {
        created: 0,
        completed: 0,
        cancelled: 0,
      };
      existing.created += 1;
      if (booking.status === "completed") existing.completed += 1;
      if (booking.status === "cancelled") existing.cancelled += 1;
      dailyMap.set(date, existing);
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate by status
    const statusMap = new Map<string, number>();
    bookings?.forEach((booking) => {
      statusMap.set(booking.status, (statusMap.get(booking.status) || 0) + 1);
    });

    const byStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Get category data
    const { data: categoryBookings, error: categoryError } = await supabase
      .from("bookings")
      .select("job:jobs(category:categories(name))")
      .gte("created_at", start)
      .lte("created_at", end + "T23:59:59");

    const categoryMap = new Map<string, number>();
    categoryBookings?.forEach((b: any) => {
      const categoryName = b.job?.category?.name || "Unknown";
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
    });

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      data: {
        daily,
        byStatus,
        byCategory,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching booking trends:", error);
    return { data: null, error: "Failed to fetch booking trends" };
  }
}

/**
 * Get payment success rate for admin analytics dashboard.
 * Queries transactions table for payment metrics; falls back to bookings payment_status if unavailable.
 * Returns success rate percentage, transaction counts, and total volume.
 *
 * @returns Result object containing payment metrics (success rate, volumes, counts) or an error message
 */
export async function getPaymentMetrics(): Promise<{
  data: PaymentMetrics | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // Get all payments/transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("status, amount")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (transactionsError) {
      // If transactions table doesn't exist, use bookings payment_status
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("payment_status, final_price")
        .not("payment_status", "is", null);

      if (bookingsError) {
        return { data: null, error: bookingsError.message };
      }

      const total = bookings?.length || 0;
      const successful =
        bookings?.filter(
          (b) => b.payment_status === "paid" || b.payment_status === "released",
        ).length || 0;
      const failed =
        bookings?.filter((b) => b.payment_status === "failed").length || 0;
      const pending =
        bookings?.filter(
          (b) => b.payment_status === "pending_review",
        ).length || 0;
      const volume =
        bookings?.reduce((sum, b) => sum + (Number(b.final_price) || 0), 0) ||
        0;

      return {
        data: {
          successRate: total > 0 ? (successful / total) * 100 : 0,
          totalTransactions: total,
          successfulPayments: successful,
          failedPayments: failed,
          pendingPayments: pending,
          totalVolume: volume,
        },
        error: null,
      };
    }

    const total = transactions?.length || 0;
    const successful =
      transactions?.filter((t) => t.status === ("success" as any)).length || 0;
    const failed =
      transactions?.filter((t) => t.status === "failed").length || 0;
    const pending =
      transactions?.filter((t) => t.status === "pending").length || 0;
    const volume =
      transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    return {
      data: {
        successRate: total > 0 ? (successful / total) * 100 : 0,
        totalTransactions: total,
        successfulPayments: successful,
        failedPayments: failed,
        pendingPayments: pending,
        totalVolume: volume,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching payment metrics:", error);
    return { data: null, error: "Failed to fetch payment metrics" };
  }
}

// ============================================================================
>>>>>>> auto-claude/046-add-jsdoc-to-undocumented-lib-actions-server-actio
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
 * Export bookings data as CSV.
 * Generates a CSV file containing all bookings with worker, business, job, and payment details.
 * Supports optional date range filtering and limits results to 10,000 rows.
 *
 * @param startDate - Optional start date filter (YYYY-MM-DD format)
 * @param endDate   - Optional end date filter (YYYY-MM-DD format)
 * @returns Result object containing CSV string data or an error message
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
 * Export payments data as CSV.
 * Attempts to use the transactions table; falls back to bookings payment data if the table is unavailable.
 * Exports up to 10,000 rows with optional date range filtering.
 *
 * @param startDate - Optional start date filter (YYYY-MM-DD format)
 * @param endDate   - Optional end date filter (YYYY-MM-DD format)
 * @returns Result object containing CSV string data or an error message
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
 * Export compliance data as CSV.
 * Exports worker-business compliance tracking records for a given month, including days worked,
 * compliance status, and warning levels.
 *
 * @param month - Optional target month (YYYY-MM format, defaults to current month)
 * @returns Result object containing CSV string data or an error message
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
 * Get compliance overview for admin dashboard.
 * Returns aggregated compliance statistics including compliant, warning, and blocked workers,
 * average days worked, and businesses with warnings for the given month.
 *
 * @param month - Optional target month (YYYY-MM format, defaults to current month)
 * @returns Result object containing compliance overview data or an error message
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
 * Get compliance warnings list for admin dashboard.
 * Retrieves all workers with warning or blocked compliance status for the given month,
 * ordered by severity and days worked.
 *
 * @param month - Optional target month (YYYY-MM format, defaults to current month)
 * @param limit - Maximum number of warnings to return (default: 50)
 * @returns Result object containing array of worker compliance detail records or an error message
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

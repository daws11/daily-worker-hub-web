"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";

// ============================================================================
// ADMIN ANALYTICS TYPES
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

// ============================================================================
// ADMIN ANALYTICS ACTIONS
// ============================================================================

/**
 * Get revenue metrics for admin analytics dashboard
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
 * Get worker statistics for admin analytics dashboard
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
 * Get booking trends for admin analytics dashboard
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
 * Get payment success rate for admin analytics dashboard
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

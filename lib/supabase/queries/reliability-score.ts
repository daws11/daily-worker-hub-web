// @ts-nocheck
import { supabase } from "../client";
import type { Database } from "../types";
import type { TrendDirection } from "@/components/worker/trend-indicator";

type WorkersRow = Database["public"]["Tables"]["workers"]["Row"];
type WorkersUpdate = Database["public"]["Tables"]["workers"]["Update"];
export type ReliabilityScoreHistoryRow =
  Database["public"]["Tables"]["reliability_score_history"]["Row"];
export type ReliabilityScoreHistoryInsert =
  Database["public"]["Tables"]["reliability_score_history"]["Insert"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];

export interface ReliabilityScoreBreakdown {
  score: number;
  attendance_rate: number;
  punctuality_rate: number;
  avg_rating: number;
  completed_jobs_count: number;
}

/**
 * Calculate reliability score based on attendance, punctuality, and ratings
 * Formula: 40% attendance + 30% punctuality + 30% ratings
 */
export async function calculateScore(
  workerId: string,
): Promise<ReliabilityScoreBreakdown | null> {
  // Get all completed bookings for the worker
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "completed");

  if (bookingsError) {
    throw new Error(
      `Failed to fetch worker bookings: ${bookingsError.message}`,
    );
  }

  if (!bookings || bookings.length === 0) {
    return null;
  }

  const bookingsTyped = bookings as BookingRow[];
  const completedJobsCount = bookingsTyped.length;

  // Calculate attendance rate
  // All completed bookings count as attended (they weren't cancelled)
  const attendance_rate = 1.0;

  // Calculate punctuality rate
  // Punctual if actual_start_time is before or equal to scheduled start_time
  let onTimeCount = 0;
  const bookingsWithTimes = bookingsTyped.filter(
    (b) => b.actual_start_time !== null && b.start_date !== null,
  );

  bookingsWithTimes.forEach((booking) => {
    const actualStart = new Date(booking.actual_start_time as string);
    const scheduledStart = new Date(booking.start_date as string);
    if (actualStart <= scheduledStart) {
      onTimeCount++;
    }
  });

  const punctuality_rate =
    bookingsWithTimes.length > 0 ? onTimeCount / bookingsWithTimes.length : 1.0;

  // Calculate average rating
  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("rating")
    .eq("worker_id", workerId);

  if (reviewsError) {
    throw new Error(`Failed to fetch worker reviews: ${reviewsError.message}`);
  }

  const reviewsTyped = reviews as ReviewRow[];
  const avg_rating =
    reviewsTyped.length > 0
      ? reviewsTyped.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsTyped.length
      : 0;

  // Calculate final score using 40/30/30 formula
  // Attendance is 40%, Punctuality is 30%, Ratings is 30%
  // Ratings are 1-5, so we normalize: (rating / 5) * 0.3
  const score =
    attendance_rate * 0.4 + punctuality_rate * 0.3 + (avg_rating / 5) * 0.3;

  // Convert to 1-5 scale
  const finalScore = Math.max(1.0, Math.min(5.0, score * 5));

  return {
    score: Math.round(finalScore * 10) / 10, // Round to 1 decimal
    attendance_rate: Math.round(attendance_rate * 100) / 100,
    punctuality_rate: Math.round(punctuality_rate * 100) / 100,
    avg_rating: Math.round(avg_rating * 10) / 10,
    completed_jobs_count: completedJobsCount,
  };
}

/**
 * Get reliability score history for a worker
 */
export async function getScoreHistory(
  workerId: string,
  limit: number = 20,
): Promise<ReliabilityScoreHistoryRow[]> {
  const { data, error } = await supabase
    .from("reliability_score_history")
    .select("*")
    .eq("worker_id", workerId)
    .order("calculated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch score history: ${error.message}`);
  }

  return (data as ReliabilityScoreHistoryRow[]) || [];
}

/**
 * Get current reliability score for a worker
 */
export async function getWorkerScore(
  workerId: string,
): Promise<WorkersRow | null> {
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch worker score: ${error.message}`);
  }

  return data as WorkersRow;
}

/**
 * Update reliability score for a worker
 */
export async function updateScore(
  workerId: string,
  score: number,
): Promise<WorkersRow> {
  const { data, error } = await supabase
    .from("workers")
    .update({
      reliability_score: score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workerId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update worker score: ${error.message}`);
  }

  return data as WorkersRow;
}

/**
 * Record a score history entry
 */
export async function recordScoreHistory(
  workerId: string,
  breakdown: ReliabilityScoreBreakdown,
): Promise<ReliabilityScoreHistoryRow> {
  const historyData: any =
    {
      worker_id: workerId,
      score: breakdown.score,
      attendance_rate: breakdown.attendance_rate,
      punctuality_rate: breakdown.punctuality_rate,
      avg_rating: breakdown.avg_rating,
      completed_jobs_count: breakdown.completed_jobs_count,
      calculated_at: new Date().toISOString(),
    };

  const { data, error } = await (supabase as any)
    .from("reliability_score_history")
    .insert(historyData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record score history: ${error.message}`);
  }

  return data as ReliabilityScoreHistoryRow;
}

/**
 * Get score trend for a worker by comparing the latest two score history entries.
 * Returns null if no history exists.
 */
export async function getWorkerScoreTrend(
  workerId: string,
): Promise<{
  trend: TrendDirection;
  previousScore?: number;
  currentScore?: number;
} | null> {
  const history = await getScoreHistory(workerId, 2);

  if (!history || history.length === 0) {
    return null;
  }

  // Filter out entries with null scores and sort by calculated_at descending
  const validHistory = (history as any)
    .filter((entry: any) => entry.score !== null)
    .sort(
      (a: any, b: any) =>
        new Date(b.calculated_at).getTime() -
        new Date(a.calculated_at).getTime(),
    );

  if (validHistory.length < 2) {
    return {
      trend: "insufficient_data" as TrendDirection,
      currentScore: validHistory[0]?.score ?? undefined,
    };
  }

  const [latest, previous] = validHistory;

  let trend: TrendDirection;
  if (latest.score! > previous.score!) {
    trend = "improving";
  } else if (latest.score! < previous.score!) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  return {
    trend,
    previousScore: previous.score!,
    currentScore: latest.score!,
  };
}

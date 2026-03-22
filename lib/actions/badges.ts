"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";

type Badge = Database["public"]["Tables"]["badges"]["Row"];
type WorkerBadge = Database["public"]["Tables"]["worker_badges"]["Row"];
type BadgeVerificationStatus = string;

export type BadgeResult = {
  success: boolean;
  error?: string;
  data?: Badge | Badge[] | null;
  count?: number;
};

export type WorkerBadgeResult = {
  success: boolean;
  error?: string;
  data?: WorkerBadge | WorkerBadge[] | null;
  count?: number;
};

export type BadgeProgress = {
  badge: Badge;
  progress: number;
  currentCount: number;
  requiredCount: number;
  isEarned: boolean;
  verificationStatus?: BadgeVerificationStatus;
};

export type BadgeProgressResult = {
  success: boolean;
  error?: string;
  data?: BadgeProgress[];
};

/**
 * Get all badges earned by a worker
 */
export async function getWorkerBadges(
  workerId: string,
): Promise<WorkerBadgeResult> {
  try {
    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from("worker_badges")
      .select(
        `
        *,
        badge:badges(*)
      `,
        { count: "exact" },
      )
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil badge worker: ${error.message}`,
      };
    }

    return { success: true, data, count: count || 0 };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil badge worker",
    };
  }
}

/**
 * Get all available badges
 */
export async function getAllBadges(category?: string): Promise<BadgeResult> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("badges")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq(
        "category",
        category as Database["public"]["Enums"]["badge_category"],
      );
    }

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil badge: ${error.message}`,
      };
    }

    return { success: true, data, count: count || 0 };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil badge" };
  }
}

/**
 * Get progress towards next badges for a worker
 * This calculates progress based on completed jobs, ratings, and other metrics
 */
export async function getBadgeProgress(
  workerId: string,
): Promise<BadgeProgressResult> {
  try {
    const supabase = await createClient();

    // Fetch all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*")
      .order("name", { ascending: true });

    if (badgesError) {
      return {
        success: false,
        error: `Gagal mengambil badge: ${badgesError.message}`,
      };
    }

    // Fetch worker's earned badges
    const { data: workerBadges, error: workerBadgesError } = await supabase
      .from("worker_badges")
      .select(
        `
        *,
        badge:badges(*)
      `,
      )
      .eq("worker_id", workerId);

    if (workerBadgesError) {
      return {
        success: false,
        error: `Gagal mengambil badge worker: ${workerBadgesError.message}`,
      };
    }

    // Get worker stats for progress calculation
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("worker_id", workerId);

    const completedJobs =
      bookings?.filter((b) => b.status === "completed").length || 0;

    // Get worker's average rating
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("worker_id", workerId);

    const avgRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Map earned badges
    const earnedBadgeIds = new Set(workerBadges?.map((wb) => wb.badge_id));
    const badgeStatusMap = new Map(
      workerBadges?.map((wb) => [wb.badge_id, wb.verification_status]),
    );

    // Calculate progress for each badge
    const progressData: BadgeProgress[] = (allBadges || []).map((badge) => {
      let progress = 0;
      let currentCount = 0;
      let requiredCount = 10;

      // Calculate progress based on badge category
      switch (badge.category) {
        case "skill":
          requiredCount = 10;
          currentCount = completedJobs;
          progress = Math.min((currentCount / requiredCount) * 100, 100);
          break;
        case "certification":
          requiredCount = 20;
          currentCount = completedJobs;
          progress = Math.min((currentCount / requiredCount) * 100, 100);
          break;
        case "specialization":
          requiredCount = 4.5;
          currentCount = avgRating;
          progress = Math.min((currentCount / requiredCount) * 100, 100);
          break;
        case "training":
          requiredCount = 15;
          currentCount = completedJobs;
          progress = Math.min((currentCount / requiredCount) * 100, 100);
          break;
        default:
          progress = 0;
      }

      return {
        badge,
        progress: earnedBadgeIds.has(badge.id) ? 100 : progress,
        currentCount,
        requiredCount,
        isEarned: earnedBadgeIds.has(badge.id),
        verificationStatus: badgeStatusMap.get(badge.id),
      };
    });

    return { success: true, data: progressData };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menghitung progress badge",
    };
  }
}

/**
 * Request a new badge for a worker
 */
export async function requestBadge(
  workerId: string,
  badgeId: string,
): Promise<WorkerBadgeResult> {
  try {
    const supabase = await createClient();

    // Check if worker already has this badge
    const { data: existing } = await supabase
      .from("worker_badges")
      .select("*")
      .eq("worker_id", workerId)
      .eq("badge_id", badgeId)
      .single();

    if (existing) {
      return { success: false, error: "Worker sudah memiliki badge ini" };
    }

    const { data, error } = await supabase
      .from("worker_badges")
      .insert({
        worker_id: workerId,
        badge_id: badgeId,
        verification_status: "pending",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: `Gagal meminta badge: ${error.message}` };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat meminta badge" };
  }
}

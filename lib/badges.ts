/**
 * Worker Achievement Badge System
 *
 * This module defines achievement badges and provides logic for checking
 * and awarding badges based on worker performance metrics.
 */

import { supabase } from "./supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export type AchievementBadgeType =
  | "FIRST_JOB"
  | "TOP_RATED"
  | "RELIABLE"
  | "FAST_RESPONDER"
  | "SUPER_WORKER"
  | "EARLY_BIRD"
  | "NIGHT_OWL"
  | "WEEKEND_WARRIOR"
  | "RISING_STAR"
  | "VETERAN"
  | "FIVE_STAR"
  | "PERFECT_ATTENDANCE"
  | "QUICK_LEARNER"
  | "CROWD_FAVORITE"
  | "CONSISTENT_EARNER"
  | "TEAM_PLAYER"
  | "GO_GETTER"
  | "PROFESSIONAL";

export interface BadgeDefinition {
  type: AchievementBadgeType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  bgColor: string; // Background color class
  criteria: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  rarity: number; // 1-100, lower = rarer
}

export interface WorkerAchievement {
  id: string;
  worker_id: string;
  badge_type: AchievementBadgeType;
  earned_at: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface BadgeProgress {
  id: string;
  worker_id: string;
  badge_type: AchievementBadgeType;
  current_value: number;
  target_value: number;
  last_updated: string;
}

export interface BadgeWithProgress extends BadgeDefinition {
  earned: boolean;
  earnedAt?: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

// ============================================================================
// BADGE DEFINITIONS
// ============================================================================

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "FIRST_JOB",
    name: "First Steps",
    description: "Completed your first job successfully",
    icon: "Flag",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    criteria: "Complete 1 job",
    tier: "bronze",
    rarity: 90,
  },
  {
    type: "TOP_RATED",
    name: "Top Rated",
    description: "Maintained an excellent rating from businesses",
    icon: "Star",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    criteria: "4.5+ avg rating with 5+ reviews",
    tier: "gold",
    rarity: 15,
  },
  {
    type: "RELIABLE",
    name: "Reliable Worker",
    description: "Consistently shows up and completes jobs",
    icon: "ShieldCheck",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    criteria: "95%+ attendance with 10+ jobs",
    tier: "silver",
    rarity: 25,
  },
  {
    type: "FAST_RESPONDER",
    name: "Fast Responder",
    description: "Quick to respond to job opportunities",
    icon: "Zap",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    criteria: "Avg response time under 1 hour",
    tier: "silver",
    rarity: 30,
  },
  {
    type: "SUPER_WORKER",
    name: "Super Worker",
    description: "Highly experienced and well-rated worker",
    icon: "Crown",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    criteria: "50+ jobs with 4.0+ rating",
    tier: "platinum",
    rarity: 5,
  },
  {
    type: "EARLY_BIRD",
    name: "Early Bird",
    description: "Dedicated to early morning work",
    icon: "Sunrise",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    criteria: "Complete 10 jobs before 8 AM",
    tier: "silver",
    rarity: 35,
  },
  {
    type: "NIGHT_OWL",
    name: "Night Owl",
    description: "Available for late night work",
    icon: "Moon",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    criteria: "Complete 10 jobs after 10 PM",
    tier: "silver",
    rarity: 35,
  },
  {
    type: "WEEKEND_WARRIOR",
    name: "Weekend Warrior",
    description: "Always available on weekends",
    icon: "Calendar",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    criteria: "Complete 20 weekend jobs",
    tier: "silver",
    rarity: 30,
  },
  {
    type: "RISING_STAR",
    name: "Rising Star",
    description: "New worker with excellent performance",
    icon: "TrendingUp",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    criteria: "4.5+ rating within first 30 days",
    tier: "bronze",
    rarity: 40,
  },
  {
    type: "VETERAN",
    name: "Veteran Worker",
    description: "Long-term dedicated worker",
    icon: "Award",
    color: "text-slate-600",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    criteria: "Active 1+ year with 20+ jobs",
    tier: "gold",
    rarity: 10,
  },
  {
    type: "FIVE_STAR",
    name: "Five Star Champion",
    description: "Consistently delivers 5-star service",
    icon: "Sparkles",
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    criteria: "Receive 10 five-star ratings",
    tier: "gold",
    rarity: 20,
  },
  {
    type: "PERFECT_ATTENDANCE",
    name: "Perfect Attendance",
    description: "Never missed a scheduled job",
    icon: "CheckCircle2",
    color: "text-teal-600",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    criteria: "100% attendance with 15+ jobs",
    tier: "gold",
    rarity: 12,
  },
  {
    type: "QUICK_LEARNER",
    name: "Quick Learner",
    description: "Hit the ground running from day one",
    icon: "Rocket",
    color: "text-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
    criteria: "Complete 5 jobs in first week",
    tier: "bronze",
    rarity: 45,
  },
  {
    type: "CROWD_FAVORITE",
    name: "Crowd Favorite",
    description: "Loved by many businesses",
    icon: "Heart",
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    criteria: "Receive 20+ positive reviews",
    tier: "gold",
    rarity: 18,
  },
  {
    type: "CONSISTENT_EARNER",
    name: "Consistent Earner",
    description: "Steady income over time",
    icon: "Wallet",
    color: "text-green-700",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    criteria: "Earned consistently for 3+ months",
    tier: "silver",
    rarity: 25,
  },
  {
    type: "TEAM_PLAYER",
    name: "Team Player",
    description: "Worked with many different businesses",
    icon: "Users",
    color: "text-blue-700",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    criteria: "Work with 10+ different businesses",
    tier: "silver",
    rarity: 30,
  },
  {
    type: "GO_GETTER",
    name: "Go-Getter",
    description: "Proactively applies for opportunities",
    icon: "Target",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    criteria: "Apply to 50+ jobs",
    tier: "bronze",
    rarity: 50,
  },
  {
    type: "PROFESSIONAL",
    name: "Professional",
    description: "Complete and verified profile",
    icon: "BadgeCheck",
    color: "text-violet-600",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    criteria: "Complete profile with verified info",
    tier: "bronze",
    rarity: 60,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get badge definition by type
 */
export function getBadgeDefinition(
  type: AchievementBadgeType,
): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((badge) => badge.type === type);
}

/**
 * Get all badge definitions sorted by tier and rarity
 */
export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return [...BADGE_DEFINITIONS].sort((a, b) => {
    const tierOrder = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return a.rarity - b.rarity;
  });
}

/**
 * Get badges by tier
 */
export function getBadgesByTier(
  tier: BadgeDefinition["tier"],
): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter((badge) => badge.tier === tier);
}

// ============================================================================
// BADGE AWARDING LOGIC
// ============================================================================

/**
 * Worker stats needed for badge checking
 */
export interface WorkerStats {
  workerId: string;
  createdAt: string;
  completedJobs: number;
  totalJobs: number;
  averageRating: number | null;
  totalReviews: number;
  fiveStarReviews: number;
  attendanceRate: number;
  responseTimeHours: number | null;
  earlyMorningJobs: number;
  nightJobs: number;
  weekendJobs: number;
  firstWeekJobs: number;
  uniqueBusinesses: number;
  totalApplications: number;
  profileComplete: boolean;
  hasVerifiedPhone: boolean;
  hasVerifiedAddress: boolean;
  earningMonths: number;
}

/**
 * Check if worker qualifies for a specific badge
 */
export function checkBadgeCriteria(
  badgeType: AchievementBadgeType,
  stats: WorkerStats,
): { qualifies: boolean; progress: number; target: number } {
  switch (badgeType) {
    case "FIRST_JOB":
      return {
        qualifies: stats.completedJobs >= 1,
        progress: stats.completedJobs,
        target: 1,
      };

    case "TOP_RATED":
      return {
        qualifies: (stats.averageRating ?? 0) >= 4.5 && stats.totalReviews >= 5,
        progress: stats.totalReviews,
        target: 5,
      };

    case "RELIABLE":
      return {
        qualifies: stats.attendanceRate >= 95 && stats.completedJobs >= 10,
        progress: stats.completedJobs,
        target: 10,
      };

    case "FAST_RESPONDER":
      return {
        qualifies: (stats.responseTimeHours ?? Infinity) < 1,
        progress: stats.responseTimeHours
          ? Math.max(0, 100 - stats.responseTimeHours * 50)
          : 0,
        target: 100,
      };

    case "SUPER_WORKER":
      return {
        qualifies:
          stats.completedJobs >= 50 && (stats.averageRating ?? 0) >= 4.0,
        progress: stats.completedJobs,
        target: 50,
      };

    case "EARLY_BIRD":
      return {
        qualifies: stats.earlyMorningJobs >= 10,
        progress: stats.earlyMorningJobs,
        target: 10,
      };

    case "NIGHT_OWL":
      return {
        qualifies: stats.nightJobs >= 10,
        progress: stats.nightJobs,
        target: 10,
      };

    case "WEEKEND_WARRIOR":
      return {
        qualifies: stats.weekendJobs >= 20,
        progress: stats.weekendJobs,
        target: 20,
      };

    case "RISING_STAR": {
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(stats.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const isNewWorker = daysSinceCreated <= 30;
      return {
        qualifies:
          isNewWorker &&
          (stats.averageRating ?? 0) >= 4.5 &&
          stats.completedJobs >= 3,
        progress: stats.completedJobs,
        target: 3,
      };
    }

    case "VETERAN": {
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(stats.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const isOneYearPlus = daysSinceCreated >= 365;
      return {
        qualifies: isOneYearPlus && stats.completedJobs >= 20,
        progress: stats.completedJobs,
        target: 20,
      };
    }

    case "FIVE_STAR":
      return {
        qualifies: stats.fiveStarReviews >= 10,
        progress: stats.fiveStarReviews,
        target: 10,
      };

    case "PERFECT_ATTENDANCE":
      return {
        qualifies: stats.attendanceRate === 100 && stats.completedJobs >= 15,
        progress: stats.completedJobs,
        target: 15,
      };

    case "QUICK_LEARNER":
      return {
        qualifies: stats.firstWeekJobs >= 5,
        progress: stats.firstWeekJobs,
        target: 5,
      };

    case "CROWD_FAVORITE":
      return {
        qualifies: stats.totalReviews >= 20,
        progress: stats.totalReviews,
        target: 20,
      };

    case "CONSISTENT_EARNER":
      return {
        qualifies: stats.earningMonths >= 3,
        progress: stats.earningMonths,
        target: 3,
      };

    case "TEAM_PLAYER":
      return {
        qualifies: stats.uniqueBusinesses >= 10,
        progress: stats.uniqueBusinesses,
        target: 10,
      };

    case "GO_GETTER":
      return {
        qualifies: stats.totalApplications >= 50,
        progress: stats.totalApplications,
        target: 50,
      };

    case "PROFESSIONAL":
      return {
        qualifies:
          stats.profileComplete &&
          stats.hasVerifiedPhone &&
          stats.hasVerifiedAddress,
        progress: [
          stats.profileComplete,
          stats.hasVerifiedPhone,
          stats.hasVerifiedAddress,
        ].filter(Boolean).length,
        target: 3,
      };

    default:
      return { qualifies: false, progress: 0, target: 1 };
  }
}

/**
 * Fetch worker stats from database
 */
export async function fetchWorkerStats(
  workerId: string,
): Promise<WorkerStats | null> {
  try {
    // Get worker basic info
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .select("id, created_at, phone, address")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      console.error("Error fetching worker:", workerError);
      return null;
    }

    // Get completed bookings count
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        "id, status, created_at, check_in_at, start_date, business_id, job_id",
      )
      .eq("worker_id", workerId);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return null;
    }

    const completedBookings =
      bookings?.filter((b) => b.status === "completed") || [];
    const totalBookings = bookings?.length || 0;

    // Get reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("rating")
      .eq("worker_id", workerId);

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError);
      return null;
    }

    const validRatings =
      reviews?.filter((r) => r.rating !== null).map((r) => r.rating) || [];
    const averageRating =
      validRatings.length > 0
        ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
        : null;
    const fiveStarReviews = validRatings.filter((r) => r === 5).length;

    // Calculate attendance rate
    const bookingsWithCheckIn = completedBookings.filter((b) => b.check_in_at);
    const attendanceRate =
      completedBookings.length > 0
        ? (bookingsWithCheckIn.length / completedBookings.length) * 100
        : 0;

    // Get unique businesses
    const uniqueBusinesses = new Set(
      completedBookings.map((b) => b.business_id),
    ).size;

    // Get job applications count
    const { count: totalApplications, error: applicationsError } =
      await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("worker_id", workerId);

    // Calculate first week jobs
    const workerCreatedAt = new Date(worker.created_at);
    const oneWeekLater = new Date(
      workerCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const firstWeekJobs = completedBookings.filter(
      (b) => new Date(b.created_at) <= oneWeekLater,
    ).length;

    // For now, set some values to 0 (would need more complex queries for real implementation)
    // These would need proper tracking in the database
    const earlyMorningJobs = 0;
    const nightJobs = 0;
    const weekendJobs = 0;
    const responseTimeHours = null;
    const earningMonths = 0;

    // Profile completeness check
    const profileComplete = !!(worker.phone && worker.address);
    const hasVerifiedPhone = !!worker.phone;
    const hasVerifiedAddress = !!worker.address;

    return {
      workerId,
      createdAt: worker.created_at,
      completedJobs: completedBookings.length,
      totalJobs: totalBookings,
      averageRating,
      totalReviews: validRatings.length,
      fiveStarReviews,
      attendanceRate,
      responseTimeHours,
      earlyMorningJobs,
      nightJobs,
      weekendJobs,
      firstWeekJobs,
      uniqueBusinesses,
      totalApplications: totalApplications || 0,
      profileComplete,
      hasVerifiedPhone,
      hasVerifiedAddress,
      earningMonths,
    };
  } catch (error) {
    console.error("Error in fetchWorkerStats:", error);
    return null;
  }
}

/**
 * Check and award badges for a worker
 */
export async function checkAndAwardBadges(workerId: string): Promise<{
  awarded: AchievementBadgeType[];
  progress: BadgeProgress[];
}> {
  const stats = await fetchWorkerStats(workerId);
  if (!stats) {
    return { awarded: [], progress: [] };
  }

  const awarded: AchievementBadgeType[] = [];
  const progressUpdates: BadgeProgress[] = [];

  // Get existing achievements
  const { data: existingAchievements } = await supabase
    .from("worker_achievements")
    .select("achievement_type")
    .eq("worker_id", workerId);

  const existingBadgeTypes = new Set(
    existingAchievements?.map((a) => a.achievement_type) || [],
  );

  // Check each badge type
  for (const badgeDef of BADGE_DEFINITIONS) {
    const check = checkBadgeCriteria(badgeDef.type, stats);

    // Note: worker_badge_progress table doesn't exist - commenting out for now
    // TODO: Create worker_badge_progress table or remove this functionality
    /*
    const { error: progressError } = await supabase
      .from("worker_badge_progress")
      .upsert(
        {
          worker_id: workerId,
          badge_type: badgeDef.type,
          current_value: check.progress,
          target_value: check.target,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "worker_id,badge_type",
        },
      );

    if (progressError) {
      console.error("Error updating badge progress:", progressError);
    }
    */

    // Award badge if qualified and not already earned
    if (check.qualifies && !existingBadgeTypes.has(badgeDef.type)) {
      const { error: awardError } = await supabase
        .from("worker_achievements")
        .insert({
          worker_id: workerId,
          achievement_type: badgeDef.type,
          title: badgeDef.name,
          description: JSON.stringify({ progress_value: check.progress }),
          awarded_at: new Date().toISOString(),
        });

      if (!awardError) {
        awarded.push(badgeDef.type);
      }
    }
  }

  // Note: worker_badge_progress table doesn't exist - returning empty progress
  // TODO: Create worker_badge_progress table or implement badge tracking
  return {
    awarded,
    progress: [],
  };
}

/**
 * Get worker's achievements with badge definitions
 */
export async function getWorkerAchievements(
  workerId: string,
): Promise<BadgeWithProgress[]> {
  // Get earned achievements
  const { data: achievements, error: achievementsError } = await supabase
    .from("worker_achievements")
    .select("*")
    .eq("worker_id", workerId)
    .order("earned_at", { ascending: false });

  if (achievementsError) {
    console.error("Error fetching achievements:", achievementsError);
    return [];
  }

  // Note: worker_badge_progress table doesn't exist - returning empty progress
  // TODO: Create worker_badge_progress table or implement badge tracking
  const progress = [];

  const earnedMap = new Map<AchievementBadgeType, any>();
  achievements?.forEach((a) =>
    earnedMap.set(a.achievement_type as AchievementBadgeType, a),
  );

  const progressMap = new Map<AchievementBadgeType, any>();
  progress?.forEach((p) =>
    progressMap.set(p.achievement_type as AchievementBadgeType, p),
  );

  // Return all badges with earned status and progress
  return BADGE_DEFINITIONS.map((def) => {
    const earned = earnedMap.get(def.type);
    const prog = progressMap.get(def.type);

    return {
      ...def,
      earned: !!earned,
      earnedAt: earned?.earned_at,
      progress: prog
        ? {
            current: prog.current_value,
            target: prog.target_value,
            percentage: Math.min(
              100,
              Math.round((prog.current_value / prog.target_value) * 100),
            ),
          }
        : undefined,
    };
  });
}

/**
 * Get worker's earned badges only
 */
export async function getWorkerEarnedBadges(
  workerId: string,
): Promise<BadgeWithProgress[]> {
  const allBadges = await getWorkerAchievements(workerId);
  return allBadges.filter((badge) => badge.earned);
}

/**
 * Get worker's badge progress (unearned badges with progress)
 */
export async function getWorkerBadgeProgress(
  workerId: string,
): Promise<BadgeWithProgress[]> {
  const allBadges = await getWorkerAchievements(workerId);
  return allBadges.filter(
    (badge) => !badge.earned && badge.progress && badge.progress.percentage > 0,
  );
}

/**
 * Trigger badge check on job completion
 */
export async function triggerBadgeCheckOnJobCompletion(
  workerId: string,
): Promise<void> {
  try {
    await checkAndAwardBadges(workerId);
  } catch (error) {
    console.error("Error triggering badge check on job completion:", error);
  }
}

/**
 * Trigger badge check on review received
 */
export async function triggerBadgeCheckOnReview(
  workerId: string,
): Promise<void> {
  try {
    await checkAndAwardBadges(workerId);
  } catch (error) {
    console.error("Error triggering badge check on review:", error);
  }
}

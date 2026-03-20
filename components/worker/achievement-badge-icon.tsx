"use client";

import * as React from "react";
import {
  Flag,
  Star,
  ShieldCheck,
  Zap,
  Crown,
  Sunrise,
  Moon,
  Calendar,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  Rocket,
  Heart,
  Wallet,
  Users,
  Target,
  BadgeCheck,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AchievementBadgeType } from "@/lib/badges";

// Map badge types to icons
const BADGE_ICONS: Record<AchievementBadgeType, LucideIcon> = {
  FIRST_JOB: Flag,
  TOP_RATED: Star,
  RELIABLE: ShieldCheck,
  FAST_RESPONDER: Zap,
  SUPER_WORKER: Crown,
  EARLY_BIRD: Sunrise,
  NIGHT_OWL: Moon,
  WEEKEND_WARRIOR: Calendar,
  RISING_STAR: TrendingUp,
  VETERAN: Award,
  FIVE_STAR: Sparkles,
  PERFECT_ATTENDANCE: CheckCircle2,
  QUICK_LEARNER: Rocket,
  CROWD_FAVORITE: Heart,
  CONSISTENT_EARNER: Wallet,
  TEAM_PLAYER: Users,
  GO_GETTER: Target,
  PROFESSIONAL: BadgeCheck,
};

// Tier colors
const TIER_COLORS = {
  bronze: {
    border: "border-amber-600",
    bg: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40",
    icon: "text-amber-700 dark:text-amber-400",
    glow: "shadow-amber-200/50 dark:shadow-amber-900/30",
  },
  silver: {
    border: "border-slate-400",
    bg: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/40 dark:to-slate-700/40",
    icon: "text-slate-600 dark:text-slate-300",
    glow: "shadow-slate-300/50 dark:shadow-slate-700/30",
  },
  gold: {
    border: "border-yellow-500",
    bg: "bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40",
    icon: "text-yellow-600 dark:text-yellow-400",
    glow: "shadow-yellow-300/50 dark:shadow-yellow-900/30",
  },
  platinum: {
    border: "border-violet-500",
    bg: "bg-gradient-to-br from-violet-100 to-purple-200 dark:from-violet-900/40 dark:to-purple-800/40",
    icon: "text-violet-600 dark:text-violet-400",
    glow: "shadow-violet-300/50 dark:shadow-violet-900/30",
  },
};

export interface AchievementBadgeIconProps {
  type: AchievementBadgeType;
  tier?: "bronze" | "silver" | "gold" | "platinum";
  size?: "sm" | "md" | "lg" | "xl";
  earned?: boolean;
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

export function AchievementBadgeIcon({
  type,
  tier = "bronze",
  size = "md",
  earned = true,
  showLabel = false,
  className,
}: AchievementBadgeIconProps) {
  const Icon = BADGE_ICONS[type] || Award;
  const tierStyle = TIER_COLORS[tier];

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 transition-all duration-300",
          sizeClasses[size],
          earned ? tierStyle.bg : "bg-gray-100 dark:bg-gray-800",
          earned ? tierStyle.border : "border-gray-300 dark:border-gray-600",
          earned && `shadow-lg ${tierStyle.glow}`,
          !earned && "opacity-50 grayscale",
        )}
      >
        <Icon
          className={cn(
            iconSizes[size],
            earned ? tierStyle.icon : "text-gray-400 dark:text-gray-500",
          )}
        />

        {/* Shine effect for earned badges */}
        {earned && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
        )}
      </div>
    </div>
  );
}

// Export icon map for use in other components
export { BADGE_ICONS, TIER_COLORS };

/**
 * Tier Badge Component
 *
 * Displays a worker's tier with appropriate styling and icon
 */

import { WorkerTier } from "@/lib/supabase/types";
import { getTierLabel, getTierBonus } from "@/lib/algorithms/tier-classifier";
import { Crown, Star, Shield, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface TierBadgeProps {
  tier: WorkerTier;
  showScore?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "detailed";
}

interface TierConfig {
  icon: typeof Crown;
  gradient: string;
  bgGradient: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

const tierConfig = {
  champion: {
    icon: Crown,
    gradient: "from-yellow-400 to-orange-500",
    bgGradient: "bg-gradient-to-r from-yellow-400 to-orange-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-400",
    label: "Champion",
  },
  elite: {
    icon: Star,
    gradient: "from-purple-400 to-pink-500",
    bgGradient: "bg-gradient-to-r from-purple-400 to-pink-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-400",
    label: "Elite",
  },
  pro: {
    icon: Shield,
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "bg-gradient-to-r from-blue-400 to-cyan-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    label: "Pro",
  },
  classic: {
    icon: Award,
    gradient: "from-gray-400 to-gray-500",
    bgGradient: "bg-gradient-to-r from-gray-400 to-gray-500",
    textColor: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-400",
    label: "Classic",
  },
} as const satisfies Record<WorkerTier, TierConfig>;

export function TierBadge({
  tier,
  showScore = false,
  showLabel = true,
  size = "md",
  variant = "default",
}: TierBadgeProps) {
  const config = tierConfig[tier] as TierConfig;
  const Icon = config.icon;
  const bonus = getTierBonus(tier);

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full border",
          config.bgColor,
          config.borderColor,
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base",
        )}
      >
        <Icon className={cn("h-3 w-3", config.textColor)} />
        {showLabel && (
          <span className={cn("font-medium", config.textColor)}>
            {getTierLabel(tier)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        size === "sm" && "gap-1",
        size === "lg" && "gap-3",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          "border-2 shadow-sm",
          config.bgColor,
          config.borderColor,
          size === "sm" && "h-6 w-6",
          size === "md" && "h-8 w-8",
          size === "lg" && "h-10 w-10",
        )}
      >
        <Icon
          className={cn(
            config.textColor,
            size === "sm" && "h-3 w-3",
            size === "md" && "h-4 w-4",
            size === "lg" && "h-5 w-5",
          )}
        />
      </div>

      <div className="flex flex-col">
        {showLabel && (
          <span
            className={cn(
              "font-bold",
              size === "sm" && "text-xs",
              size === "md" && "text-sm",
              size === "lg" && "text-base",
              config.textColor,
            )}
          >
            {getTierLabel(tier)}
          </span>
        )}
        {showScore && (
          <span
            className={cn(
              "text-xs font-medium text-gray-500",
              size === "lg" && "text-sm",
            )}
          >
            +{bonus} bonus
          </span>
        )}
      </div>
    </div>
  );
}

interface TierBadgeSmallProps {
  tier: WorkerTier;
}

export function TierBadgeSmall({ tier }: TierBadgeSmallProps) {
  return (
    <TierBadge tier={tier} size="sm" variant="minimal" showLabel={false} />
  );
}

interface TierBadgeCompactProps {
  tier: WorkerTier;
  showLabel?: boolean;
}

export function TierBadgeCompact({
  tier,
  showLabel = true,
}: TierBadgeCompactProps) {
  return (
    <TierBadge tier={tier} size="sm" variant="minimal" showLabel={showLabel} />
  );
}

interface TierBadgeDetailedProps {
  tier: WorkerTier;
  jobsCompleted?: number;
  rating?: number;
  punctuality?: number;
  compact?: boolean;
}

export function TierBadgeDetailed({
  tier,
  jobsCompleted,
  rating,
  punctuality,
  compact = false,
}: TierBadgeDetailedProps) {
  const config = tierConfig[tier] as TierConfig;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        compact ? "p-2" : "flex items-start gap-3 p-3 rounded-lg border",
        config.bgColor,
        config.borderColor,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          "border-2",
          config.bgGradient,
          compact ? "h-6 w-6" : "h-10 w-10",
        )}
      >
        <Icon className={cn("text-white", compact ? "h-3 w-3" : "h-5 w-5")} />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-bold text-sm", config.textColor)}>
            {getTierLabel(tier)}
          </span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full bg-white/50",
              config.textColor,
            )}
          >
            +{getTierBonus(tier)} bonus
          </span>
        </div>

        {jobsCompleted !== undefined && (
          <div className="text-xs text-gray-600">
            {jobsCompleted} jobs completed
          </div>
        )}

        {rating !== undefined && (
          <div className="text-xs text-gray-600">
            Rating: {rating.toFixed(1)}/5.0
          </div>
        )}

        {punctuality !== undefined && (
          <div className="text-xs text-gray-600">
            Punctuality: {punctuality.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

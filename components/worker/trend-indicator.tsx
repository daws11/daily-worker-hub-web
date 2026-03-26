import * as React from "react";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type TrendDirection =
  | "improving"
  | "declining"
  | "stable"
  | "insufficient_data";

export interface TrendIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  trend: TrendDirection;
  label?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const getTrendStyles = (
  trend: TrendDirection,
): {
  icon: React.ElementType;
  iconClassName: string;
  containerClassName: string;
} => {
  switch (trend) {
    case "improving":
      return {
        icon: TrendingUp,
        iconClassName:
          "text-green-600 dark:text-green-400",
        containerClassName:
          "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      };
    case "declining":
      return {
        icon: TrendingDown,
        iconClassName: "text-red-600 dark:text-red-400",
        containerClassName:
          "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      };
    case "stable":
      return {
        icon: Minus,
        iconClassName: "text-gray-500 dark:text-gray-400",
        containerClassName:
          "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
      };
    case "insufficient_data":
    default:
      return {
        icon: HelpCircle,
        iconClassName: "text-gray-400 dark:text-gray-500",
        containerClassName:
          "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
      };
  }
};

const getTrendLabel = (trend: TrendDirection): string => {
  switch (trend) {
    case "improving":
      return "Improving";
    case "declining":
      return "Declining";
    case "stable":
      return "Stable";
    case "insufficient_data":
      return "Insufficient data";
    default:
      return "";
  }
};

const getSizeClasses = (
  size: "sm" | "md" | "lg",
): { container: string; icon: string; label: string } => {
  switch (size) {
    case "sm":
      return {
        container: "px-1.5 py-0.5 text-xs",
        icon: "h-3 w-3",
        label: "text-xs",
      };
    case "lg":
      return {
        container: "px-3 py-1.5 text-sm",
        icon: "h-5 w-5",
        label: "text-sm",
      };
    case "md":
    default:
      return {
        container: "px-2 py-1 text-xs",
        icon: "h-3.5 w-3.5",
        label: "text-xs",
      };
  }
};

export function TrendIndicator({
  trend,
  label,
  showLabel = false,
  size = "md",
  className,
  ...props
}: TrendIndicatorProps) {
  const { icon: Icon, iconClassName, containerClassName } =
    getTrendStyles(trend);
  const sizeClasses = getSizeClasses(size);
  const displayLabel = label ?? getTrendLabel(trend);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border",
        containerClassName,
        sizeClasses.container,
        className,
      )}
      {...props}
    >
      <Icon className={cn(iconClassName, sizeClasses.icon)} />
      {showLabel && (
        <span className={cn("font-medium", sizeClasses.label)}>
          {displayLabel}
        </span>
      )}
    </div>
  );
}

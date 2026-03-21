import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Status configuration for color-coded badges
 */
const statusConfig: Record<
  string,
  { label: string; className: string; dotClassName?: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    dotClassName: "bg-amber-500",
  },
  accepted: {
    label: "Accepted",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    dotClassName: "bg-blue-500",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    dotClassName: "bg-green-500",
  },
  completed: {
    label: "Completed",
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
    dotClassName: "bg-gray-500",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    dotClassName: "bg-red-500",
  },
  open: {
    label: "Open",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    dotClassName: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700",
    dotClassName: "bg-slate-500",
  },
  active: {
    label: "Active",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    dotClassName: "bg-green-500",
  },
  inactive: {
    label: "Inactive",
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
    dotClassName: "bg-gray-400",
  },
  verified: {
    label: "Verified",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    dotClassName: "bg-green-500",
  },
  unverified: {
    label: "Unverified",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    dotClassName: "bg-amber-500",
  },
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status type to display */
  status: string;
  /** Custom label (overrides default) */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show status dot indicator */
  showDot?: boolean;
  /** Use icon instead of text */
  icon?: React.ReactNode;
}

/**
 * StatusBadge component for displaying color-coded status indicators
 *
 * @example
 * ```tsx
 * <StatusBadge status="pending" />
 * <StatusBadge status="completed" showDot />
 * <StatusBadge status="in_progress" label="Sedang Berlangsung" />
 * ```
 */
export function StatusBadge({
  status,
  label,
  size = "md",
  showDot = false,
  icon,
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
  const displayLabel = label || config.label;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        sizeClasses[size],
        config.className,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            config.dotClassName || "bg-current"
          )}
        />
      )}
      {icon}
      {displayLabel}
    </span>
  );
}

/**
 * Quick status badge presets for common use cases
 */
export function PendingBadge({
  label,
  ...props
}: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="pending" label={label} {...props} />;
}

export function AcceptedBadge({
  label,
  ...props
}: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="accepted" label={label} {...props} />;
}

export function InProgressBadge({
  label,
  ...props
}: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="in_progress" label={label} {...props} />;
}

export function CompletedBadge({
  label,
  ...props
}: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="completed" label={label} {...props} />;
}

export function CancelledBadge({
  label,
  ...props
}: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="cancelled" label={label} {...props} />;
}

export { statusConfig };

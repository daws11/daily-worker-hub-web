import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Props for the EmptyState component
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display (React node) */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button props */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "ghost" | "outline";
  };
  /** Custom illustration URL or component */
  illustration?: React.ReactNode;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Gradient accent variant */
  gradient?: "primary" | "success" | "warning" | "destructive" | "none";
  /** Enable entrance animation */
  animated?: boolean;
}

/**
 * Default icons for common empty states
 */
const defaultIcons = {
  empty: (
    <svg
      className="h-12 w-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
  search: (
    <svg
      className="h-12 w-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-12 w-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  noData: (
    <svg
      className="h-12 w-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  noUsers: (
    <svg
      className="h-12 w-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
};

/**
 * Gradient classes for icon backgrounds
 */
const gradientClasses = {
  primary: "bg-gradient-primary",
  success: "bg-gradient-success",
  warning: "bg-gradient-warning",
  destructive: "bg-gradient-destructive",
  none: "bg-primary/10",
};

/**
 * EmptyState component for displaying empty or no-data states
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="Belum ada pekerja"
 *   description="Tambahkan pekerja pertama Anda untuk memulai"
 *   action={{ label: "Tambah Pekerja", onClick: handleAdd }}
 *   gradient="primary"
 *   animated
 * />
 * ```
 */
export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  illustration,
  size = "md",
  gradient = "none",
  animated = true,
  ...props
}: EmptyStateProps) {
  const sizes = {
    sm: {
      container: "py-8 px-4",
      icon: "h-10 w-10",
      iconWrapper: "p-3",
      title: "text-base",
      description: "text-sm",
    },
    md: {
      container: "py-12 px-6",
      icon: "h-12 w-12",
      iconWrapper: "p-4",
      title: "text-lg",
      description: "text-base",
    },
    lg: {
      container: "py-16 px-8",
      icon: "h-16 w-16",
      iconWrapper: "p-5",
      title: "text-xl",
      description: "text-lg",
    },
  };

  const animationClass = animated ? "animate-empty-state" : "";
  const staggerDelay = animated ? "opacity-0" : "";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes[size].container,
        animationClass,
        className,
      )}
      {...props}
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <div className={cn("mb-4 animate-icon-bounce stagger-1", staggerDelay)}>
          {illustration}
        </div>
      ) : (
        <div
          className={cn(
            "mb-4 rounded-full text-white",
            gradientClasses[gradient],
            sizes[size].iconWrapper,
            animated && "animate-icon-bounce stagger-1 opacity-0",
            gradient === "none" && "text-primary",
          )}
          aria-hidden="true"
        >
          <div className={sizes[size].icon}>
            {icon || defaultIcons.empty}
          </div>
        </div>
      )}

      {/* Title with gradient option */}
      <h3
        className={cn(
          "font-semibold text-foreground",
          sizes[size].title,
          animated && "stagger-2 opacity-0",
          animated && "[animation:empty-state-enter_0.4s_ease-out_0.15s_forwards]",
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            "mt-2 text-muted-foreground max-w-sm",
            sizes[size].description,
            animated && "stagger-3 opacity-0",
            animated && "[animation:empty-state-enter_0.4s_ease-out_0.25s_forwards]",
          )}
        >
          {description}
        </p>
      )}

      {/* Action Button with gradient styling */}
      {action && (
        <div
          className={cn(
            "mt-6",
            animated && "stagger-4 opacity-0",
            animated && "[animation:empty-state-enter_0.4s_ease-out_0.35s_forwards]",
          )}
        >
          <Button
            variant={action.variant || "primary"}
            size="md"
            onClick={action.onClick}
            className={cn(
              "transition-all duration-200",
              "hover:scale-105 active:scale-95",
              gradient !== "none" && action.variant === "primary" && "bg-gradient-primary hover:opacity-90",
            )}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Props for EmptyStateCard component
 */
export interface EmptyStateCardProps extends EmptyStateProps {
  /** Whether to show a bordered card style */
  bordered?: boolean;
}

/**
 * EmptyStateCard component for empty states within a card container
 *
 * @example
 * ```tsx
 * <EmptyStateCard
 *   title="Tidak ada hasil"
 *   description="Coba ubah filter pencarian Anda"
 *   icon={defaultIcons.search}
 *   gradient="primary"
 *   animated
 * />
 * ```
 */
export function EmptyStateCard({
  className,
  bordered = false,
  ...props
}: EmptyStateCardProps) {
  return (
    <EmptyState
      className={cn(
        "rounded-2xl bg-white dark:bg-slate-900",
        bordered &&
          "border-2 border-dashed border-slate-200 dark:border-slate-700",
        className,
      )}
      {...props}
    />
  );
}

// Export default icons for use in parent components
export { defaultIcons };

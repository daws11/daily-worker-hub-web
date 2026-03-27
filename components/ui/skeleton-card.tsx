import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Job Card Skeleton - Shows placeholder while job/booking data loads
 */
export function JobCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header with Avatar and Status */}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </CardHeader>

      {/* Content with Job Details */}
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 flex-1 max-w-[120px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 flex-1 max-w-[100px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>

      {/* Footer with Actions */}
      <div className="px-4 py-3 bg-muted/30 border-t flex justify-end gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </Card>
  );
}

/**
 * Stat Card Skeleton - Shows placeholder while dashboard stats load
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-16" />
    </Card>
  );
}

/**
 * Conversation Card Skeleton - Shows placeholder while messages load
 */
export function ConversationCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Avatar */}
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Header: Name + Time */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>

            {/* Job Title */}
            <Skeleton className="h-3 w-40" />

            {/* Last Message */}
            <Skeleton className="h-3 w-full" />

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Application Card Skeleton - Shows placeholder while applications load
 */
export function ApplicationCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardHeader>

      <CardContent className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 flex-1" />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Worker List Skeleton - Shows placeholder while worker data loads
 */
export function WorkerCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard Greeting Skeleton - Shows placeholder while user data loads
 */
export function DashboardGreetingSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

/**
 * Quick Stats Grid Skeleton - Shows multiple stat cards in a grid
 */
export function QuickStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Job List Skeleton - Shows multiple job cards in a grid
 */
export function JobListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Conversation List Skeleton - Shows multiple conversation cards
 */
export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Application Grid Skeleton - Shows multiple application cards in a grid
 */
export function ApplicationGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ApplicationCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Page Header Skeleton - Shows placeholder for page title and actions
 */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}

/**
 * Tab Bar Skeleton - Shows placeholder for tab navigation
 */
export function TabBarSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-md shrink-0" />
      ))}
    </div>
  );
}

/**
 * Full Page Loading Skeleton - Complete loading state for dashboard pages
 */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeaderSkeleton />
      <QuickStatsSkeleton count={3} />
      <JobListSkeleton count={2} />
    </div>
  );
}

/**
 * Messages Page Skeleton - Complete loading state for messages page
 */
export function MessagesPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <QuickStatsSkeleton count={2} />
      <ConversationListSkeleton count={5} />
    </div>
  );
}

/**
 * Bookings Page Skeleton - Complete loading state for bookings page
 */
export function BookingsPageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeaderSkeleton />
      <QuickStatsSkeleton count={3} />
      <div className="space-y-8">
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Applications Page Skeleton - Complete loading state for applications page
 */
export function ApplicationsPageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeaderSkeleton />
      <TabBarSkeleton count={4} />
      <ApplicationGridSkeleton count={6} />
    </div>
  );
}

/**
 * Review Card Skeleton - Shows placeholder while review data loads
 * Supports both WorkerReviewDisplay and BusinessReviewDisplay variants
 */
export function ReviewCardSkeleton({
  variant = "worker",
  size = "md",
  className,
}: {
  variant?: "worker" | "business";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeStyles = {
    sm: {
      container: "p-4",
      avatar: "h-8 w-8",
      text: "text-xs",
      stars: "h-3 w-3",
      rating: "text-xs",
    },
    md: {
      container: "p-6",
      avatar: "h-10 w-10",
      text: "text-sm",
      stars: "h-4 w-4",
      rating: "text-sm",
    },
    lg: {
      container: "p-6",
      avatar: "h-12 w-12",
      text: "text-base",
      stars: "h-5 w-5",
      rating: "text-base",
    },
  };

  const styles = sizeStyles[size];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn(styles.container, "pb-3")}>
        <div className="flex items-start justify-between gap-3">
          {/* Left: Avatar + Name + Date */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className={cn(styles.avatar, "rounded-full shrink-0")} />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className={cn("h-4 w-32", styles.text)} />
              <div className="flex items-center gap-1.5">
                <Skeleton className={cn(styles.stars, "shrink-0")} />
                <Skeleton className={cn("h-3 w-20", styles.text)} />
              </div>
            </div>
          </div>

          {/* Right: Stars + Rating + Badge */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className={cn(styles.stars)} />
                ))}
              </div>
              <Skeleton className={cn("h-4 w-8 font-bold", styles.rating)} />
            </div>
            {variant === "worker" && (
              <Skeleton className="h-5 w-24 rounded-full" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Comment Section */}
      <CardContent className={cn("pt-0", styles.container, "space-y-2")}>
        <Skeleton className={cn("h-3 w-full", styles.text)} />
        <Skeleton className={cn("h-3 w-3/4", styles.text)} />
      </CardContent>
    </Card>
  );
}

/**
 * Review List Skeleton - Shows multiple review cards in a list
 */
export function ReviewListSkeleton({
  count = 3,
  variant = "worker",
  size = "md",
}: {
  count?: number;
  variant?: "worker" | "business";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewCardSkeleton key={i} variant={variant} size={size} />
      ))}
    </div>
  );
}

/**
 * Reviews Page Skeleton - Complete loading state for reviews page
 */
export function ReviewsPageSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeaderSkeleton />
      <QuickStatsSkeleton count={3} />
      <ReviewListSkeleton count={4} variant="worker" />
    </div>
  );
}

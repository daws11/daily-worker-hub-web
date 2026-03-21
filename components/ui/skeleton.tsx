import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        className
      )}
      {...props}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/5" />
    </div>
  );
}

// Dashboard stat card skeleton
function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      {/* Gradient accent bar skeleton */}
      <Skeleton className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" />
      
      <div className="flex items-center gap-2 mb-3 pl-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-16 pl-2" />
    </div>
  );
}

// Dashboard quick stats skeleton grid
function SkeletonQuickStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard
          key={i}
          className={cn(
            "animate-slide-up opacity-0",
            i === 0 && "animation-delay-100",
            i === 1 && "animation-delay-200",
            i === 2 && "animation-delay-300",
            i === 3 && "animation-delay-400"
          )}
        />
      ))}
    </div>
  );
}

// Card skeleton for lists
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

// Text skeleton variants
function SkeletonText({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
function SkeletonAvatar({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />;
}

// Booking card skeleton
function SkeletonBookingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="pt-2 border-t border-border space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonStatCard,
  SkeletonQuickStats,
  SkeletonCard,
  SkeletonText,
  SkeletonAvatar,
  SkeletonBookingCard,
};

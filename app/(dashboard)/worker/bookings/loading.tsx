import { Skeleton } from "@/components/ui/skeleton";

export default function WorkerBookingsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Booking Groups */}
      <div className="space-y-8">
        {[1, 2].map((group) => (
          <div key={group} className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3].map((card) => (
                <Skeleton key={card} className="h-48" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

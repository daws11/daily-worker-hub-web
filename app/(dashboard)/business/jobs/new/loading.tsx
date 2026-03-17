import { Skeleton } from "@/components/ui/skeleton"

export default function NewJobLoading() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}

        {/* Submit Button */}
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}

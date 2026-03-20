import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-gray-700" />
            <Skeleton className="h-4 w-24 bg-gray-700" />
          </div>
        </div>
        <Skeleton className="h-10 w-24 bg-gray-700" />
      </div>

      {/* Video Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Main Video */}
        <Skeleton className="h-full min-h-[300px] bg-gray-800 rounded-lg" />

        {/* Remote Video */}
        <Skeleton className="h-full min-h-[300px] bg-gray-800 rounded-lg" />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-800">
        <Skeleton className="h-12 w-12 rounded-full bg-gray-700" />
        <Skeleton className="h-12 w-12 rounded-full bg-gray-700" />
        <Skeleton className="h-12 w-12 rounded-full bg-red-700" />
        <Skeleton className="h-12 w-12 rounded-full bg-gray-700" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function NewSessionLoading() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Session</h1>
      <div className="space-y-5 rounded-xl border bg-white p-6">
        {/* Name */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* Date */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* Time row */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        {/* Location */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        {/* Courts + max players */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        {/* Permission toggles */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
        {/* Submit button */}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

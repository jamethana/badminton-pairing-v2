import { Skeleton } from "@/components/ui/skeleton";

export default function PlayerSessionLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 h-14 border-b bg-white shadow-sm" />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Tabs skeleton */}
        <div className="flex border-b bg-white rounded-t-xl overflow-hidden">
          <div className="flex-1 py-3 flex items-center justify-center">
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="flex-1 py-3 flex items-center justify-center">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex-1 py-3 flex items-center justify-center">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* My Status card skeleton */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-[44px] w-full rounded-full sm:w-28" />
          </div>
          {/* Green current match block placeholder */}
          <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
            <Skeleton className="h-4 w-48" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-6 mx-auto" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-[44px] w-full rounded-lg" />
          </div>
        </div>

        {/* Courts card skeleton */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
            >
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

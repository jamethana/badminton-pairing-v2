export default function ModPlayerStatsLoading() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-24 rounded-lg bg-gray-200 animate-pulse" />
        <div className="space-y-1">
          <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>

      {/* Player header */}
      <div className="rounded-xl border bg-white p-4 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gray-200 animate-pulse shrink-0" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4 text-center space-y-2">
            <div className="h-7 w-12 rounded bg-gray-200 animate-pulse mx-auto" />
            <div className="h-3 w-20 rounded bg-gray-200 animate-pulse mx-auto" />
          </div>
        ))}
      </div>

      {/* Recent games skeleton */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3">
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

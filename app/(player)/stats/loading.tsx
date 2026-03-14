export default function StatsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />

      {/* Player header skeleton */}
      <div className="rounded-xl border bg-white p-4 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none shrink-0" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-28 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Games Played — icon + value/label */}
        <div className="rounded-xl border border-l-4 border-blue-200 bg-white p-4 flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-gray-200 animate-pulse motion-reduce:animate-none shrink-0" />
          <div className="space-y-1">
            <div className="h-7 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="h-3 w-16 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
        {/* Win Rate — value + bar + label */}
        <div className="rounded-xl border bg-white p-4 text-center space-y-2">
          <div className="h-7 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto" />
          <div className="h-2 w-full rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto" />
        </div>
        {/* Current Streak, Best Win Streak */}
        <div className="rounded-xl border bg-white p-4 text-center space-y-2">
          <div className="h-7 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto" />
          <div className="h-3 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto" />
        </div>
        <div className="rounded-xl border bg-white p-4 text-center space-y-2">
          <div className="h-7 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto" />
          <div className="h-3 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto" />
        </div>
      </div>

      {/* Recent games skeleton */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3">
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MatchHistoryLoading() {
  return (
    <div className="space-y-5">
      {/* Back link + title */}
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="h-8 w-44 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
      </div>

      {/* Count summary */}
      <div className="h-3 w-32 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />

      {/* Match card skeletons — header + body to match always-expanded layout */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            {/* Header: badge + text + score */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-3/5 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                <div className="h-3 w-2/5 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-6 w-12 shrink-0 rounded-md bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
            {/* Divider */}
            <div className="border-t border-gray-100" />
            {/* Body: court + two team rows */}
            <div className="space-y-1.5 px-3 pb-3 pt-2">
              <div className="h-3 w-1/3 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 shrink-0 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                <div className="flex gap-1.5">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-6 w-6 shrink-0 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="h-3 flex-1 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 shrink-0 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                <div className="flex gap-1.5">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-6 w-6 shrink-0 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="h-3 flex-1 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

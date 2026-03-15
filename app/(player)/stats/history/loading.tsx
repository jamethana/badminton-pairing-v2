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

      {/* Match row skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
          >
            {/* W/L badge */}
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-200 animate-pulse motion-reduce:animate-none" />
            {/* Text lines */}
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/5 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-2/5 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
            {/* Score + chevron */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="h-6 w-12 rounded-md bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-4 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

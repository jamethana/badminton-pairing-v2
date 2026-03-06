export default function SessionResultsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 h-8 w-24 shrink-0 rounded-lg bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-6 w-48 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          <div className="h-4 w-64 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="h-8 w-32 shrink-0 rounded-lg bg-gray-200 animate-pulse motion-reduce:animate-none" />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b">
        <div className="px-6 py-3">
          <div className="h-4 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="px-6 py-3">
          <div className="h-4 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
      </div>

      {/* Result cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-3 w-36 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
            <div className="flex items-stretch gap-3">
              <div className="flex-1 space-y-1.5 rounded-lg p-2">
                <div className="h-3 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-1 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-24 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-1 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                </div>
              </div>
              <div className="flex items-center">
                <div className="h-4 w-4 rounded bg-gray-100" />
              </div>
              <div className="flex-1 space-y-1.5 rounded-lg p-2">
                <div className="h-3 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-1 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-24 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-1 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayerSessionResultsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* NavBar placeholder */}
      <div className="sticky top-0 z-40 h-14 border-b bg-white shadow-sm" />

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Title */}
        <div className="mb-4 space-y-1.5">
          <div className="h-6 w-48 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          <div className="h-4 w-64 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
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
          {Array.from({ length: 4 }).map((_, i) => (
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
      </main>
    </div>
  );
}

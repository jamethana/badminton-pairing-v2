export default function PlayerSessionLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 h-14 border-b bg-white shadow-sm" />
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-64 rounded bg-gray-200 animate-pulse" />
        </div>

        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-8 w-20 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
                </div>
                <div className="h-7 w-20 rounded-full bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

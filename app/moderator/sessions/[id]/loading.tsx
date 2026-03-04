export default function SessionDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="mt-1.5 h-4 w-56 rounded bg-gray-200" />
        </div>
        <div className="h-6 w-16 rounded-full bg-gray-200" />
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex border-b">
        <div className="px-6 py-3">
          <div className="h-4 w-12 rounded bg-gray-200" />
        </div>
        <div className="px-6 py-3">
          <div className="h-4 w-12 rounded bg-gray-200" />
        </div>
      </div>

      {/* Courts grid */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="h-5 w-20 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-32 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Players section */}
      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
              <div className="h-full w-1.5 rounded-full bg-gray-200 self-stretch" />
              <div className="h-7 w-7 rounded-full bg-gray-200" />
              <div className="flex-1 h-4 rounded bg-gray-200" />
              <div className="h-6 w-16 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

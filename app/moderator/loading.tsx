export default function ModeratorDashboardLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="mt-1.5 h-4 w-32 rounded bg-gray-200" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200" />
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-3 sm:p-4">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="mt-2 h-8 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
        <div className="divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="mt-1.5 h-3 w-28 rounded bg-gray-200" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

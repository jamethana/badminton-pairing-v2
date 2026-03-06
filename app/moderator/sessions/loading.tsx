export default function SessionsLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-28 rounded bg-gray-200" />
        <div className="h-9 w-32 rounded-lg bg-gray-200" />
      </div>

      {/* Filter bar skeleton */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[160, 144, 176, 176].map((w, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-3.5 w-16 rounded bg-gray-200" />
            <div className="h-8 rounded-md bg-gray-200" style={{ width: w }} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4">
              <div>
                <div className="h-4 w-48 rounded bg-gray-200" />
                <div className="mt-1.5 h-3 w-36 rounded bg-gray-200" />
                <div className="mt-1 h-3 w-24 rounded bg-gray-200" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

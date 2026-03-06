export default function HomeLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting skeleton */}
      <div className="space-y-1.5">
        <div className="h-8 w-56 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-72 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
      </div>

      {/* Sessions list skeleton */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3">
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1.5">
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                <div className="h-3 w-28 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

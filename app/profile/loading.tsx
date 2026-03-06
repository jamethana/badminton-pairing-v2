export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 h-14 border-b bg-white shadow-sm" />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          <div className="h-4 w-64 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-40 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
          <div className="mt-4 h-10 rounded-lg bg-gray-100 animate-pulse motion-reduce:animate-none" />
        </div>
      </main>
    </div>
  );
}

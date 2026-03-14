export default function PlayersLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-7 w-24 rounded bg-gray-200 sm:h-8" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>

      {/* Add button skeleton */}
      <div className="mb-4 flex justify-end">
        <div className="h-9 w-28 rounded-lg bg-gray-200" />
      </div>

      {/* Mobile card list skeleton */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-8 rounded-full bg-gray-200" />
                  <div className="h-5 w-16 rounded-full bg-gray-200" />
                </div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table skeleton */}
      <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Name", "Skill", "LINE", "Role", "Actions"].map((col) => (
                <th key={col} className="px-4 py-3 text-left">
                  <div className="h-3 w-12 rounded bg-gray-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gray-200" />
                    <div className="h-4 w-32 rounded bg-gray-200" />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="mx-auto h-5 w-8 rounded-full bg-gray-200" />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="mx-auto h-5 w-16 rounded-full bg-gray-200" />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="mx-auto h-4 w-12 rounded bg-gray-200" />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="ml-auto h-4 w-8 rounded bg-gray-200" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

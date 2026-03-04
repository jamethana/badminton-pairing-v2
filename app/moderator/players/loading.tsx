export default function PlayersLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-24 rounded bg-gray-200" />
        <div className="h-9 w-28 rounded-lg bg-gray-200" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
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

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import Link from "next/link";
import ModeratorRecentSessionsList from "@/components/moderator-recent-sessions-list";

export default async function ModeratorDashboard() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // perf-2: Run independent queries in parallel
  const [{ data: sessions }, { count: playerCount }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: false })
      .limit(5),
    // perf-2 (bug fix): Use { head: true } to get the count without fetching rows
    supabase.from("users").select("*", { count: "exact", head: true }),
  ]);

  const activeSessions = sessions?.filter((s) => s.status === "active") ?? [];
  const upcomingSessions = sessions?.filter((s) => s.status === "draft") ?? [];

  // Enrich sessions with creator display names
  const uniqueCreatorIds = [
    ...new Set(
      (sessions ?? [])
        .map((s) => s.created_by)
        .filter((id): id is string => id !== null)
    ),
  ];
  let creatorNameById = new Map<string, string>();
  if (uniqueCreatorIds.length > 0) {
    const { data: creatorUsers } = await supabase
      .from("users")
      .select("id, display_name")
      .in("id", uniqueCreatorIds);
    creatorNameById = new Map(
      (creatorUsers ?? []).map((u) => [u.id, u.display_name])
    );
  }
  const sessionsWithCreator = (sessions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    date: s.date,
    location: s.location,
    status: s.status,
    creatorDisplayName: s.created_by ? creatorNameById.get(s.created_by) : undefined,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderator Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.appUser.display_name}</p>
        </div>
        <Link
          href="/moderator/sessions/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          + New Session
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">Total Players</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{playerCount ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">Active</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{activeSessions.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{upcomingSessions.length}</p>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border bg-white">
        <ModeratorRecentSessionsList sessions={sessionsWithCreator} />
      </div>
    </div>
  );
}

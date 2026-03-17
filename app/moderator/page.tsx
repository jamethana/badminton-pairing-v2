import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import Link from "next/link";
import ModeratorRecentSessionsList from "@/components/moderator-recent-sessions-list";
import type { PlayerLite } from "@/components/avatar-stack";

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

  const uniqueCreatorIds = [
    ...new Set(
      (sessions ?? [])
        .map((s) => s.created_by)
        .filter((id): id is string => id !== null)
    ),
  ];
  const sessionIds = (sessions ?? []).map((s) => s.id);

  const [creatorUsersRes, playerRowsRes] = await Promise.all([
    uniqueCreatorIds.length > 0
      ? supabase.from("users").select("id, display_name").in("id", uniqueCreatorIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    sessionIds.length > 0
      ? supabase
          .from("session_players")
          .select("session_id, users(id, display_name, picture_url)")
          .in("session_id", sessionIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
  ]);

  const creatorNameById = new Map(
    (creatorUsersRes.data ?? []).map((u) => [u.id, u.display_name])
  );

  const playerCountMap = new Map<string, number>();
  const playerSampleMap = new Map<string, PlayerLite[]>();
  for (const row of playerRowsRes.data ?? []) {
    const sid = row.session_id;
    const usr = row.users;
    if (!usr) continue;

    playerCountMap.set(sid, (playerCountMap.get(sid) ?? 0) + 1);
    const sample = playerSampleMap.get(sid) ?? [];
    if (sample.length < 4) {
      sample.push({
        id: usr.id,
        display_name: usr.display_name,
        picture_url: usr.picture_url,
      });
      playerSampleMap.set(sid, sample);
    }
  }

  const sessionsWithCreator = (sessions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    date: s.date,
    location: s.location,
    status: s.status,
    creatorDisplayName: s.created_by ? creatorNameById.get(s.created_by) : undefined,
    playerCount: playerCountMap.get(s.id) ?? 0,
    playerSample: playerSampleMap.get(s.id) ?? [],
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Moderator Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.appUser.display_name}</p>
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
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Players</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{playerCount ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{activeSessions.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Upcoming</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{upcomingSessions.length}</p>
        </div>
      </div>

      {/* Recent sessions */}
      <ModeratorRecentSessionsList sessions={sessionsWithCreator} />
    </div>
  );
}

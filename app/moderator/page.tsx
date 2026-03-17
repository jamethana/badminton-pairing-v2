import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import Link from "next/link";
import ModeratorRecentSessionsList from "@/components/moderator-recent-sessions-list";
import type { PlayerLite } from "@/components/avatar-stack";
import { Badge } from "@/components/ui/badge";

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
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Moderator Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.appUser.display_name}
          </p>
        </div>
        <Link
          href="/moderator/sessions/new"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          + New Session
        </Link>
      </header>

      {/* Stats */}
      <section
        aria-label="Session statistics"
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
      >
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Players</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{playerCount ?? 0}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs sm:text-sm text-muted-foreground">Active sessions</p>
            <Badge variant="secondary" className="text-[11px] font-semibold uppercase">
              Live
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {activeSessions.length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs sm:text-sm text-muted-foreground">Upcoming sessions</p>
            <Badge variant="outline" className="text-[11px] font-semibold uppercase">
              Draft
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {upcomingSessions.length}
          </p>
        </div>
      </section>

      {/* Recent sessions */}
      <section aria-label="Recent sessions">
        <ModeratorRecentSessionsList sessions={sessionsWithCreator} />
      </section>
    </main>
  );
}

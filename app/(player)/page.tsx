import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewAs } from "@/lib/view-as";
import UserSessionsList, { type UserSession } from "@/components/user-sessions-list";
import type { PlayerLite } from "@/components/avatar-stack";

export default async function Home() {
  const [user, viewAs] = await Promise.all([getCurrentUser(), getViewAs()]);

  if (!user) {
    redirect("/login");
  }

  // Moderators go to their dashboard unless they've switched to player view
  if (user.appUser.is_moderator && viewAs !== "player") {
    redirect("/moderator");
  }

  const supabase = await createClient();

  // Get sessions the player is part of
  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select(`sessions(*)`)
    .eq("user_id", user.appUser.id);

  const rawSessions = (sessionPlayers ?? [])
    .map((sp) => sp.sessions)
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Enrich sessions with creator display names
  const uniqueCreatorIds = [
    ...new Set(
      rawSessions
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

  // Fetch joined players per session for count and avatar preview (all players in those sessions)
  const sessionIds = rawSessions.map((s) => s.id);
  const playerCountMap = new Map<string, number>();
  const playerSampleMap = new Map<string, PlayerLite[]>();

  if (sessionIds.length > 0) {
    const { data: playerRows } = await supabase
      .from("session_players")
      .select("session_id, users(id, display_name, picture_url)")
      .in("session_id", sessionIds)
      .eq("is_active", true);

    for (const row of playerRows ?? []) {
      const sid = row.session_id;
      const user = row.users;
      if (!user) continue;

      playerCountMap.set(sid, (playerCountMap.get(sid) ?? 0) + 1);
      const sample = playerSampleMap.get(sid) ?? [];
      if (sample.length < 4) {
        sample.push({
          id: user.id,
          display_name: user.display_name,
          picture_url: user.picture_url,
        });
        playerSampleMap.set(sid, sample);
      }
    }
  }

  const sessions: UserSession[] = rawSessions.map((s) => ({
    id: s.id,
    name: s.name,
    date: s.date,
    location: s.location,
    status: s.status,
    creatorDisplayName: s.created_by ? creatorNameById.get(s.created_by) : undefined,
    playerCount: playerCountMap.get(s.id) ?? 0,
    playerSample: playerSampleMap.get(s.id) ?? [],
  }));

  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {user.appUser.display_name}! 👋
        </h1>
        <p className="text-sm text-gray-500">
          DM Jame for bugs, feedback, or feature requests!
        </p>
      </div>

      {activeSessions.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-green-400 bg-green-50 p-4">
          <p className="mb-2 text-sm font-semibold text-green-800">Live Session</p>
          {activeSessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="block text-lg font-bold text-green-700 hover:underline"
            >
              {s.name} →
            </Link>
          ))}
        </div>
      )}

      <UserSessionsList sessions={sessions} />
    </>
  );
}

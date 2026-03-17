import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getViewAs } from "@/lib/view-as";
import UserSessionsList, { type UserSession } from "@/components/user-sessions-list";
import type { PlayerLite } from "@/components/avatar-stack";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const uniqueCreatorIds = [
    ...new Set(
      rawSessions
        .map((s) => s.created_by)
        .filter((id): id is string => id !== null)
    ),
  ];
  const sessionIds = rawSessions.map((s) => s.id);

  const [creatorUsersRes, playerRowsRes, totalPlayerRowsRes] = await Promise.all([
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
    sessionIds.length > 0
      ? supabase.from("session_players").select("session_id").in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
  ]);

  const creatorNameById = new Map(
    (creatorUsersRes.data ?? []).map((u) => [u.id, u.display_name])
  );

  const playerCountMap = new Map<string, number>();
  const playerSampleMap = new Map<string, PlayerLite[]>();
  const totalPlayerCountMap = new Map<string, number>();
  for (const row of totalPlayerRowsRes.data ?? []) {
    totalPlayerCountMap.set(row.session_id, (totalPlayerCountMap.get(row.session_id) ?? 0) + 1);
  }
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

  const sessions: UserSession[] = rawSessions.map((s) => ({
    id: s.id,
    name: s.name,
    date: s.date,
    location: s.location,
    status: s.status,
    creatorDisplayName: s.created_by ? creatorNameById.get(s.created_by) : undefined,
    playerCount: playerCountMap.get(s.id) ?? 0,
    playerSample: playerSampleMap.get(s.id) ?? [],
    maxPlayers: s.max_players,
    totalPlayerCount: totalPlayerCountMap.get(s.id) ?? 0,
  }));

  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {user.appUser.display_name}! 👋
        </h1>
        <p className="text-sm text-gray-500">
          DM Jame for bugs, feedback, feature requests, or anything else! Ho asss frontend delivery excellences always breaking on me from simple changes, but I'll try my best to fix them. Please don't hesitate to report anything that seems broken or unexpected or if you have a suggestion for the name of the app.
        </p>
      </div>

      {activeSessions.length > 0 && (
        <Card className="mb-6 border border-border bg-card">
          <CardHeader className="flex flex-row items-center gap-2 px-4 pt-4">
            <Badge variant="secondary" className="text-xs font-semibold">
              Live Session
            </Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-2">
            {activeSessions.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="block text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {s.name} →
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <UserSessionsList sessions={sessions} />
    </>
  );
}

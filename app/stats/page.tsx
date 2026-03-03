import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/nav-bar";
import { computePlayerStats } from "@/lib/utils/session-stats";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // Get all sessions the user has played in
  const { data: sessionPlayers } = await supabase
    .from("session_players")
    .select(`session_id, sessions(name, date)`)
    .eq("user_id", user.appUser.id);

  const sessionIds = (sessionPlayers ?? []).map((sp) => sp.session_id);

  // Get all pairings the user was part of
  const { data: allPairings } = await supabase
    .from("pairings")
    .select(`*, game_results(*)`)
    .in("session_id", sessionIds.length > 0 ? sessionIds : ["none"])
    .neq("status", "voided")
    .or(
      `team_a_player_1.eq.${user.appUser.id},team_a_player_2.eq.${user.appUser.id},team_b_player_1.eq.${user.appUser.id},team_b_player_2.eq.${user.appUser.id}`
    );

  const pairings = allPairings ?? [];
  const completed = pairings.filter((p) => p.status === "completed");

  // Compute stats
  let wins = 0;
  let losses = 0;
  for (const p of completed) {
    const result = p.game_results ?? null;
    if (!result) continue;
    const isTeamA = [p.team_a_player_1, p.team_a_player_2].includes(user.appUser.id);
    if (
      (isTeamA && result.winner_team === "team_a") ||
      (!isTeamA && result.winner_team === "team_b")
    ) {
      wins++;
    } else {
      losses++;
    }
  }

  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0;

  // Per-session breakdown
  const sessionBreakdown = (sessionPlayers ?? []).map((sp) => {
    const sessionPairings = pairings.filter((p) => p.session_id === sp.session_id);
    const sessionStats = computePlayerStats(sessionPairings, [user.appUser.id]);
    const s = sessionStats.get(user.appUser.id);
    const sessionCompleted = sessionPairings.filter((p) => p.status === "completed");
    let sessionWins = 0;
    for (const p of sessionCompleted) {
      const result = p.game_results ?? null;
      if (!result) continue;
      const isTeamA = [p.team_a_player_1, p.team_a_player_2].includes(user.appUser.id);
      if (
        (isTeamA && result.winner_team === "team_a") ||
        (!isTeamA && result.winner_team === "team_b")
      ) {
        sessionWins++;
      }
    }
    return {
      sessionId: sp.session_id,
      sessionName: (sp.sessions as { name: string; date: string } | null)?.name ?? "Unknown",
      sessionDate: (sp.sessions as { date: string } | null)?.date ?? "",
      matchesPlayed: s?.matchesPlayed ?? 0,
      wins: sessionWins,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        isModerator={false}
        displayName={user.appUser.display_name}
        pictureUrl={user.appUser.picture_url}
      />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">My Statistics</h1>

        {/* Overall stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-sm text-gray-500">Games Played</p>
            <p className="text-3xl font-bold text-gray-900">{completed.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-sm text-gray-500">Win Rate</p>
            <p className={cn("text-3xl font-bold", winRate >= 50 ? "text-green-600" : "text-red-500")}>
              {winRate}%
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-sm text-gray-500">Skill Level</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className={cn("h-4 w-4 rounded-full", getSkillColor(user.appUser.skill_level))} />
              <p className="text-2xl font-bold text-gray-900">{user.appUser.skill_level}</p>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-sm text-gray-500">Wins</p>
            <p className="text-2xl font-bold text-green-600">{wins}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <p className="text-sm text-gray-500">Losses</p>
            <p className="text-2xl font-bold text-red-500">{losses}</p>
          </div>
        </div>

        {/* Per-session breakdown */}
        {sessionBreakdown.length > 0 && (
          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold text-gray-800">Session History</h2>
            </div>
            <div className="divide-y">
              {sessionBreakdown
                .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
                .map((s) => (
                  <div key={s.sessionId} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{s.sessionName}</p>
                      <p className="text-sm text-gray-500">
                        {s.matchesPlayed} game{s.matchesPlayed !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{s.wins}W</p>
                      <p className="text-xs text-gray-400">
                        {s.matchesPlayed - s.wins}L
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {completed.length === 0 && (
          <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-gray-400">
            No games played yet. Join a session to start tracking your stats!
          </div>
        )}
      </main>
    </div>
  );
}

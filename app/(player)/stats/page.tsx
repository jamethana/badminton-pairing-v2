import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlayerStatsView from "@/components/player-stats-view";
import { computeCareerStats } from "@/lib/utils/player-career-stats";
import type { PairingFull } from "@/lib/utils/player-career-stats";

export default async function MyStatsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { appUser } = currentUser;
  const supabase = await createClient();

  const { data: pairings } = await supabase
    .from("pairings")
    .select(`*, game_results(*), sessions(id, name, date)`)
    .or(
      `team_a_player_1.eq.${appUser.id},team_a_player_2.eq.${appUser.id},team_b_player_1.eq.${appUser.id},team_b_player_2.eq.${appUser.id}`
    )
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  const safePairings = (pairings ?? []) as PairingFull[];

  // Collect all unique player IDs involved in these pairings for name lookup (exclude null — deleted user)
  const allPlayerIds = new Set<string>();
  for (const p of safePairings) {
    [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2]
      .filter((id): id is string => id != null)
      .forEach((id) => allPlayerIds.add(id));
  }
  allPlayerIds.delete(appUser.id);

  const { data: otherUsers } = await supabase
    .from("users")
    .select("id, display_name, picture_url")
    .in("id", [...allPlayerIds]);

  const userNameMap = new Map<string, string>(
    (otherUsers ?? []).map((u) => [u.id, u.display_name])
  );
  userNameMap.set(appUser.id, appUser.display_name);

  const userPictureMap = new Map<string, string | null>();
  (otherUsers ?? []).forEach((u) => userPictureMap.set(u.id, u.picture_url ?? null));
  userPictureMap.set(appUser.id, appUser.picture_url ?? null);

  const stats = computeCareerStats(safePairings, appUser.id, userNameMap);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">My Stats</h1>
        <p className="text-sm text-gray-500">Your all-time career statistics</p>
      </div>
      <PlayerStatsView
        player={appUser}
        stats={stats}
        userNameMap={userNameMap}
        userPictureMap={userPictureMap}
      />
    </>
  );
}

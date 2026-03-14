import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PlayerStatsView from "@/components/player-stats-view";
import { computeCareerStats } from "@/lib/utils/player-career-stats";
import type { PairingFull } from "@/lib/utils/player-career-stats";

export default async function ModeratorPlayerStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: playerId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = createAdminClient();

  const [playerRes, pairingsRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", playerId).maybeSingle(),
    supabase
      .from("pairings")
      .select(`*, game_results(*), sessions(id, name, date)`)
      .or(
        `team_a_player_1.eq.${playerId},team_a_player_2.eq.${playerId},team_b_player_1.eq.${playerId},team_b_player_2.eq.${playerId}`
      )
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
  ]);

  if (!playerRes.data) notFound();

  const player = playerRes.data;
  const safePairings = (pairingsRes.data ?? []) as PairingFull[];

  // Collect all unique player IDs for name lookup (exclude null — deleted user)
  const allPlayerIds = new Set<string>();
  for (const p of safePairings) {
    [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2]
      .filter((id): id is string => id != null)
      .forEach((id) => allPlayerIds.add(id));
  }
  allPlayerIds.delete(playerId);

  const { data: otherUsers } = allPlayerIds.size > 0
    ? await supabase.from("users").select("id, display_name, picture_url").in("id", [...allPlayerIds])
    : { data: [] };

  const userNameMap = new Map<string, string>(
    (otherUsers ?? []).map((u) => [u.id, u.display_name])
  );
  userNameMap.set(playerId, player.display_name);

  const userPictureMap = new Map<string, string | null>();
  (otherUsers ?? []).forEach((u) => userPictureMap.set(u.id, u.picture_url ?? null));
  userPictureMap.set(playerId, player.picture_url ?? null);

  const stats = computeCareerStats(safePairings, playerId, userNameMap);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/moderator/players"
          className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Players
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {player.display_name} — Stats
          </h1>
          <p className="text-sm text-gray-500">Career statistics</p>
        </div>
      </div>
      <PlayerStatsView
        player={player}
        stats={stats}
        userNameMap={userNameMap}
        userPictureMap={userPictureMap}
      />
    </div>
  );
}

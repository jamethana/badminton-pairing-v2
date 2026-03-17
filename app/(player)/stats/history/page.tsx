import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import MatchHistoryList from "@/components/match-history-list";
import type { PairingFull } from "@/lib/utils/player-career-stats";

const PAGE_SIZE = 25;

export default async function MatchHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const { appUser } = currentUser;
  const supabase = await createClient();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = page * PAGE_SIZE - 1;

  const orFilter = `team_a_player_1.eq.${appUser.id},team_a_player_2.eq.${appUser.id},team_b_player_1.eq.${appUser.id},team_b_player_2.eq.${appUser.id}`;

  const [{ data: pairings }, { count }] = await Promise.all([
    supabase
      .from("pairings")
      .select(`*, game_results(*), sessions(id, name, date)`)
      .or(orFilter)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .range(from, to),
    supabase
      .from("pairings")
      .select("id", { count: "exact", head: true })
      .or(orFilter)
      .eq("status", "completed"),
  ]);

  const safePairings = (pairings ?? []) as PairingFull[];
  const totalCount = count ?? 0;

  const allPlayerIds = new Set<string>();
  for (const p of safePairings) {
    [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2]
      .filter((id): id is string => id != null)
      .forEach((id) => allPlayerIds.add(id));
  }
  allPlayerIds.delete(appUser.id);

  const { data: otherUsers } =
    allPlayerIds.size > 0
      ? await supabase
          .from("users")
          .select("id, display_name, picture_url")
          .in("id", [...allPlayerIds])
      : { data: [] };

  const userNameMap: Record<string, string> = {};
  (otherUsers ?? []).forEach((u) => { userNameMap[u.id] = u.display_name; });
  userNameMap[appUser.id] = appUser.display_name;

  const userPictureMap: Record<string, string | null> = {};
  (otherUsers ?? []).forEach((u) => { userPictureMap[u.id] = u.picture_url ?? null; });
  userPictureMap[appUser.id] = appUser.picture_url ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-5">
        <Link
          href="/stats"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to My Stats</span>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Match History</h1>
        <p className="text-sm text-muted-foreground">All your completed games</p>
      </header>
      <section aria-label="Match history list">
        <MatchHistoryList
          pairings={safePairings}
          userId={appUser.id}
          userNameMap={userNameMap}
          userPictureMap={userPictureMap}
          totalCount={totalCount}
          currentPage={page}
          pageSize={PAGE_SIZE}
        />
      </section>
    </main>
  );
}

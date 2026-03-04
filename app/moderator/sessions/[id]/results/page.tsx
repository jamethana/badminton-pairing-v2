import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { getSkillColor } from "@/components/skill-bar";
import { cn } from "@/lib/utils";

export default async function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [sessionRes, pairingsRes, playersRes] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).single(),
    supabase
      .from("pairings")
      .select(`*, game_results(*)`)
      .eq("session_id", id)
      .eq("status", "completed")
      .order("sequence_number", { ascending: true }),
    supabase
      .from("session_players")
      .select(`users(id, display_name, skill_level)`)
      .eq("session_id", id),
  ]);

  if (!sessionRes.data) notFound();

  const session = sessionRes.data;
  const pairings = pairingsRes.data ?? [];
  const playerMap = new Map(
    (playersRes.data ?? [])
      .map((sp) => sp.users)
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, u])
  );

  const getPlayer = (id: string) => playerMap.get(id);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/moderator/sessions/${id}`}
          className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Dashboard
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{session.name} — Results</h1>
          <p className="text-sm text-gray-500">
            {pairings.length} completed game{pairings.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {pairings.length === 0 ? (
          <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-gray-400">
            No completed games yet.
          </div>
        ) : (
          pairings.map((pairing) => {
            const result = pairing.game_results ?? null;
            const players = {
              a1: getPlayer(pairing.team_a_player_1),
              a2: getPlayer(pairing.team_a_player_2),
              b1: getPlayer(pairing.team_b_player_1),
              b2: getPlayer(pairing.team_b_player_2),
            };

            return (
              <div key={pairing.id} className="rounded-xl border bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">
                    #{pairing.sequence_number} · Court {pairing.court_number}
                    {pairing.completed_at && (
                      <> · {format(new Date(pairing.completed_at), "HH:mm")}</>
                    )}
                  </span>
                  {result && (result.team_a_score > 0 || result.team_b_score > 0) && (
                    <span className="text-sm font-bold text-gray-700">
                      {result.team_a_score} – {result.team_b_score}
                    </span>
                  )}
                </div>

                <div className="flex items-stretch gap-3">
                  {/* Team A */}
                  <div className={cn("flex-1 rounded-lg p-2", result?.winner_team === "team_a" && "bg-green-50 border border-green-200")}>
                    <p className="mb-1 text-xs font-semibold text-gray-400">
                      Team A {result?.winner_team === "team_a" && "🏆"}
                    </p>
                    {[players.a1, players.a2].map(
                      (p, i) =>
                        p && (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className={cn("h-3 w-1 rounded-full", getSkillColor(p.skill_level))} />
                            <span className="text-sm">{p.display_name}</span>
                          </div>
                        )
                    )}
                  </div>

                  <div className="flex items-center text-xs font-bold text-gray-300">VS</div>

                  {/* Team B */}
                  <div className={cn("flex-1 rounded-lg p-2", result?.winner_team === "team_b" && "bg-green-50 border border-green-200")}>
                    <p className="mb-1 text-xs font-semibold text-gray-400">
                      Team B {result?.winner_team === "team_b" && "🏆"}
                    </p>
                    {[players.b1, players.b2].map(
                      (p, i) =>
                        p && (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className={cn("h-3 w-1 rounded-full", getSkillColor(p.skill_level))} />
                            <span className="text-sm">{p.display_name}</span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

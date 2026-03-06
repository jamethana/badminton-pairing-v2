import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";
import type { Tables } from "@/types/database";

type Pairing = Tables<"pairings"> & {
  game_results?: Tables<"game_results"> | null;
};

type PlayerInfo = {
  id: string;
  display_name: string;
  skill_level: number;
  picture_url?: string | null;
};

interface SessionResultsListProps {
  pairings: Pairing[];
  getPlayer: (id: string) => PlayerInfo | undefined;
}

export default function SessionResultsList({ pairings, getPlayer }: SessionResultsListProps) {
  if (pairings.length === 0) {
    return (
      <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-gray-400">
        No completed games yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pairings.map((pairing) => {
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
              <div
                className={cn(
                  "flex-1 rounded-lg p-2",
                  result?.winner_team === "team_a" && "border border-green-200 bg-green-50"
                )}
              >
                <p className="mb-1 text-xs font-semibold text-gray-400">
                  Team A {result?.winner_team === "team_a" && "🏆"}
                </p>
                {[players.a1, players.a2].map(
                  (p, i) =>
                    p && (
                      <div key={i} className="flex items-center gap-1.5">
                        {p.picture_url ? (
                          <img
                            src={p.picture_url}
                            alt=""
                            className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-500"
                            aria-hidden
                          >
                            {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className={cn("h-3 w-1 rounded-full", getSkillColor(p.skill_level))} />
                        <span className="text-sm">{p.display_name}</span>
                      </div>
                    )
                )}
              </div>

              <div className="flex items-center text-xs font-bold text-gray-300">VS</div>

              {/* Team B */}
              <div
                className={cn(
                  "flex-1 rounded-lg p-2",
                  result?.winner_team === "team_b" && "border border-green-200 bg-green-50"
                )}
              >
                <p className="mb-1 text-xs font-semibold text-gray-400">
                  Team B {result?.winner_team === "team_b" && "🏆"}
                </p>
                {[players.b1, players.b2].map(
                  (p, i) =>
                    p && (
                      <div key={i} className="flex items-center gap-1.5">
                        {p.picture_url ? (
                          <img
                            src={p.picture_url}
                            alt=""
                            className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-500"
                            aria-hidden
                          >
                            {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className={cn("h-3 w-1 rounded-full", getSkillColor(p.skill_level))} />
                        <span className="text-sm">{p.display_name}</span>
                      </div>
                    )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

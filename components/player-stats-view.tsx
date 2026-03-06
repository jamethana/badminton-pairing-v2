import type { CareerStats, PairingFull } from "@/lib/utils/player-career-stats";
import type { Tables } from "@/types/database";
import { getSkillColor } from "@/components/skill-bar";
import { DELETED_USER_DISPLAY_NAME } from "@/lib/utils/deleted-user";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  player: Pick<Tables<"users">, "id" | "display_name" | "skill_level" | "picture_url">;
  stats: CareerStats;
  userNameMap: Map<string, string>;
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-white p-4 text-center", highlight && "border-green-200 bg-green-50")}>
      <p className={cn("text-2xl font-bold", highlight ? "text-green-700" : "text-gray-900")}>
        {value}
      </p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function RecentGameRow({
  pairing,
  userId,
  userNameMap,
}: {
  pairing: PairingFull;
  userId: string;
  userNameMap: Map<string, string>;
}) {
  const onA =
    pairing.team_a_player_1 === userId || pairing.team_a_player_2 === userId;
  const result = pairing.game_results;
  const won = result?.winner_team
    ? (onA && result.winner_team === "team_a") || (!onA && result.winner_team === "team_b")
    : null;

  const myTeam = onA
    ? [pairing.team_a_player_1, pairing.team_a_player_2]
    : [pairing.team_b_player_1, pairing.team_b_player_2];
  const oppTeam = onA
    ? [pairing.team_b_player_1, pairing.team_b_player_2]
    : [pairing.team_a_player_1, pairing.team_a_player_2];

  const getName = (id: string | null) =>
    id != null ? (userNameMap.get(id) ?? DELETED_USER_DISPLAY_NAME) : DELETED_USER_DISPLAY_NAME;
  const partner = myTeam.find((id) => id !== userId) ?? null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2",
        won === true && "border-green-200 bg-green-50",
        won === false && "border-red-100 bg-red-50"
      )}
    >
      <span
        className={cn(
          "w-7 text-center text-sm font-bold",
          won === true ? "text-green-600" : "text-red-500"
        )}
      >
        {won === null ? "–" : won ? "W" : "L"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          w/ {getName(partner)} vs {oppTeam.map(getName).join(" & ")}
        </p>
        <p className="text-xs text-gray-400">
          {pairing.sessions?.name}
          {pairing.completed_at && (
            <> · {format(new Date(pairing.completed_at), "d MMM")}</>
          )}
        </p>
      </div>
    </div>
  );
}

export default function PlayerStatsView({ player, stats, userNameMap }: Props) {
  const {
    played,
    wins,
    losses,
    winRate,
    currentStreak,
    bestWinStreak,
    sessionCount,
    avgGamesPerSession,
    topPartners,
    sessionBreakdown,
    recentGames,
  } = stats;

  return (
    <div className="space-y-6">
      {/* Player header */}
      <div className="flex items-center gap-4 rounded-xl border bg-white p-4">
        {player.picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.picture_url}
            alt={player.display_name}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white",
              getSkillColor(player.skill_level)
            )}
          >
            {player.display_name.charAt(0)}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{player.display_name}</h2>
          <p className="text-sm text-gray-500">
            {sessionCount} session
            {sessionCount !== 1 ? "s" : ""} attended
          </p>
        </div>
      </div>

      {/* Summary stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Games Played" value={played} />
        <StatCard
          label="Win Rate"
          value={winRate !== null ? `${winRate}%` : "–"}
          sub={`${wins}W – ${losses}L`}
          highlight={winRate !== null && winRate >= 50}
        />
        <StatCard
          label="Current Streak"
          value={
            currentStreak
              ? `${currentStreak.count}${currentStreak.type}`
              : "–"
          }
          highlight={!!currentStreak && currentStreak.type === "W"}
        />
        <StatCard
          label="Best Win Streak"
          value={bestWinStreak > 0 ? `${bestWinStreak}W` : "–"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Sessions" value={sessionCount} />
        <StatCard label="Avg Games / Session" value={avgGamesPerSession} />
        <StatCard label="Total Wins" value={wins} />
      </div>

      {/* Top Partners */}
      {topPartners.length > 0 && (
        <div className="rounded-xl border bg-white">
          <h3 className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
            Top Partners
          </h3>
          <div className="divide-y">
            {topPartners.map((p) => {
              const pWinRate = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;
              return (
                <div key={p.partnerId} className="flex items-center px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800">{p.partnerName}</p>
                    <p className="text-xs text-gray-400">
                      {p.games} game{p.games !== 1 ? "s" : ""} together
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-bold",
                        pWinRate >= 50 ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {pWinRate}%
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.wins}W–{p.games - p.wins}L
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session breakdown */}
      {sessionBreakdown.length > 0 && (
        <div className="rounded-xl border bg-white">
          <h3 className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
            Session History
          </h3>
          <div className="divide-y">
            {sessionBreakdown.map((s) => {
              const wr = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
              return (
                <div key={s.sessionId} className="flex items-center px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800">{s.sessionName}</p>
                    {s.sessionDate && (
                      <p className="text-xs text-gray-400">
                        {format(new Date(s.sessionDate), "d MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">
                      {s.wins}W–{s.losses}L
                    </p>
                    <p className="text-xs text-gray-400">{s.played} games · {wr}% win</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent games */}
      {recentGames.length > 0 && (
        <div className="rounded-xl border bg-white">
          <h3 className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
            Recent Games
          </h3>
          <div className="space-y-2 p-3">
            {recentGames.map((p) => (
              <RecentGameRow
                key={p.id}
                pairing={p}
                userId={player.id}
                userNameMap={userNameMap}
              />
            ))}
          </div>
        </div>
      )}

      {played === 0 && (
        <div className="rounded-xl border bg-white px-4 py-10 text-center text-sm text-gray-400">
          No completed games yet.
        </div>
      )}
    </div>
  );
}

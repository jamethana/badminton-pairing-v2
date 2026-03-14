import type { CareerStats, PairingFull, RivalStat } from "@/lib/utils/player-career-stats";
import type { Tables } from "@/types/database";
import { getSkillColor } from "@/components/skill-bar";
import { DELETED_USER_DISPLAY_NAME } from "@/lib/utils/deleted-user";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  player: Pick<Tables<"users">, "id" | "display_name" | "skill_level" | "picture_url">;
  stats: CareerStats;
  userNameMap: Map<string, string>;
  userPictureMap: Map<string, string | null>;
}

function PlayerAvatar({
  pictureUrl,
  displayName,
  size = 32,
}: {
  pictureUrl: string | null | undefined;
  displayName: string;
  size?: number;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200"
    >
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-gray-500">{initial}</span>
      )}
    </div>
  );
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
  userPictureMap,
}: {
  pairing: PairingFull;
  userId: string;
  userNameMap: Map<string, string>;
  userPictureMap: Map<string, string | null>;
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
  const partnerName = getName(partner);
  const oppNames = oppTeam.map(getName);

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
          "w-7 shrink-0 text-center text-sm font-bold",
          won === true ? "text-green-600" : "text-red-500"
        )}
      >
        {won === null ? "–" : won ? "W" : "L"}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        {partner != null && (
          <PlayerAvatar
            pictureUrl={userPictureMap.get(partner) ?? null}
            displayName={partnerName}
            size={28}
          />
        )}
        {oppTeam.map((id) =>
          id != null ? (
            <PlayerAvatar
              key={id}
              pictureUrl={userPictureMap.get(id) ?? null}
              displayName={getName(id)}
              size={28}
            />
          ) : null
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          w/ {partnerName} vs {oppNames.join(" & ")}
        </p>
        <p className="text-xs text-gray-400">
          {pairing.sessions?.name}
          {pairing.completed_at && (
            <> · {format(new Date(pairing.completed_at), "d MMM, h:mm a")}</>
          )}
        </p>
      </div>
    </div>
  );
}

export default function PlayerStatsView({ player, stats, userNameMap, userPictureMap }: Props) {
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
    topRivals,
    uniquePartners,
    uniqueOpponents,
    uniquePlayersMet,
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

      {/* Social stats strip */}
      <div
        className="flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
        aria-label={`Social: ${uniquePartners} partners, ${uniqueOpponents} opponents, ${uniquePlayersMet} players met`}
      >
        <span className="font-semibold text-gray-600">Social</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-800">
          <span className="font-semibold text-gray-900">{uniquePartners}</span>{" "}
          partner{uniquePartners !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-800">
          <span className="font-semibold text-gray-900">{uniqueOpponents}</span>{" "}
          opponent{uniqueOpponents !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-800">
          <span className="font-semibold text-gray-900">{uniquePlayersMet}</span>{" "}
          met
        </span>
      </div>

      {/* Top Partners + Top Rivals side by side */}
      {(topPartners.length > 0 || topRivals.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topPartners.length > 0 && (
            <div className="rounded-xl border bg-white">
              <h3 className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                Top Partner
              </h3>
              <div className="divide-y">
                {topPartners.map((p) => {
                  const pWinRate = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;
                  return (
                    <div key={p.partnerId} className="flex items-center gap-3 px-4 py-2.5">
                      <PlayerAvatar
                        pictureUrl={userPictureMap.get(p.partnerId) ?? null}
                        displayName={p.partnerName}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">{p.partnerName}</p>
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

          {topRivals.length > 0 && (
            <div className="rounded-xl border bg-white">
              <h3 className="border-b px-4 py-3 text-sm font-semibold text-gray-700">
                Top Rival
              </h3>
              <div className="divide-y">
                {topRivals.map((r: RivalStat) => {
                  const rWinRate = r.games > 0 ? Math.round((r.wins / r.games) * 100) : 0;
                  return (
                    <div key={r.rivalId} className="flex items-center gap-3 px-4 py-2.5">
                      <PlayerAvatar
                        pictureUrl={userPictureMap.get(r.rivalId) ?? null}
                        displayName={r.rivalName}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">{r.rivalName}</p>
                        <p className="text-xs text-gray-400">
                          {r.games} game{r.games !== 1 ? "s" : ""} against
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            rWinRate >= 50 ? "text-green-600" : "text-red-500"
                          )}
                        >
                          {rWinRate}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {r.wins}W–{r.games - r.wins}L
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                userPictureMap={userPictureMap}
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

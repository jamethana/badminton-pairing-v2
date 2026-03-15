"use client";

import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DELETED_USER_DISPLAY_NAME } from "@/lib/utils/deleted-user";
import type { PairingFull } from "@/lib/utils/player-career-stats";

interface MatchHistoryListProps {
  pairings: PairingFull[];
  userId: string;
  userNameMap: Record<string, string>;
  userPictureMap: Record<string, string | null>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

function PlayerAvatar({
  pictureUrl,
  displayName,
}: {
  pictureUrl: string | null | undefined;
  displayName: string;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase();
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[10px] font-semibold text-gray-500">
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pictureUrl} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

function MatchCard({
  pairing,
  userId,
  userNameMap,
  userPictureMap,
}: {
  pairing: PairingFull;
  userId: string;
  userNameMap: Record<string, string>;
  userPictureMap: Record<string, string | null>;
}) {
  const onA = pairing.team_a_player_1 === userId || pairing.team_a_player_2 === userId;
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
    id != null ? (userNameMap[id] ?? DELETED_USER_DISPLAY_NAME) : DELETED_USER_DISPLAY_NAME;
  const getPicture = (id: string | null) => (id != null ? (userPictureMap[id] ?? null) : null);

  const partner = myTeam.find((id) => id !== userId) ?? null;
  const partnerName = getName(partner);

  const myPlayerIds = [userId, partner].filter((id): id is string => id != null);
  const oppPlayerIds = oppTeam.filter((id): id is string => id != null);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        won === true && "border-green-200",
        won === false && "border-red-100",
        won === null && "border-gray-200"
      )}
    >
      {/* Header row */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-3",
          won === true && "bg-green-50",
          won === false && "bg-red-50",
          won === null && "bg-white"
        )}
      >
        {/* W/L badge */}
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
            won === true && "bg-green-500 text-white",
            won === false && "bg-red-400 text-white",
            won === null && "bg-gray-200 text-gray-500"
          )}
        >
          {won === null ? "–" : won ? "W" : "L"}
        </span>

        {/* Session + date */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {pairing.sessions?.name ?? "Unknown session"}
          </p>
          <p className="truncate text-xs text-gray-500">
            {pairing.completed_at
              ? format(new Date(pairing.completed_at), "d MMM yyyy · h:mm a")
              : pairing.sessions?.date
                ? format(new Date(pairing.sessions.date), "d MMM yyyy")
                : "Unknown date"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div
        className={cn(
          "border-t",
          won === true && "border-green-100",
          won === false && "border-red-100",
          won === null && "border-gray-100"
        )}
      />

      {/* Body — court + teams */}
      <div
        className={cn(
          "space-y-2 px-3 pb-3 pt-2",
          won === true && "bg-green-50/60",
          won === false && "bg-red-50/60",
          won === null && "bg-gray-50"
        )}
      >
        <p className="text-xs text-gray-500">
          Court {pairing.court_number}
          {pairing.sessions?.name && <> · {pairing.sessions.name}</>}
        </p>

        {/* Teams: left column vs right column */}
        <div className="flex items-center gap-1">
          {/* Your team */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {myPlayerIds.map((id) => (
              <div key={id} className="flex min-w-0 items-center gap-1.5">
                <PlayerAvatar
                  pictureUrl={userPictureMap[id] ?? null}
                  displayName={userNameMap[id] ?? "You"}
                />
                <span className="truncate text-xs text-gray-700">
                  {userNameMap[id] ?? "You"}
                </span>
              </div>
            ))}
          </div>

          {/* vs */}
          <span className="shrink-0 px-2 text-xs font-medium text-gray-400">vs</span>

          {/* Opponents */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {oppPlayerIds.map((id) => (
              <div key={id} className="flex min-w-0 items-center gap-1.5">
                <PlayerAvatar
                  pictureUrl={getPicture(id)}
                  displayName={getName(id)}
                />
                <span className="truncate text-xs text-gray-700">{getName(id)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatchHistoryList({
  pairings,
  userId,
  userNameMap,
  userPictureMap,
  totalCount,
  currentPage,
  pageSize,
}: MatchHistoryListProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (totalCount === 0) {
    return (
      <div className="rounded-xl border bg-white px-4 py-12 text-center">
        <p className="text-sm text-gray-400">No matches yet. Play some games to see your history here.</p>
        <Link
          href="/stats"
          className="mt-4 inline-block text-sm font-medium text-green-700 hover:underline"
        >
          Back to My Stats
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Match count summary */}
      <p className="text-xs text-gray-400">
        {totalCount} match{totalCount !== 1 ? "es" : ""} total
        {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
      </p>

      {/* Match cards */}
      <div className="space-y-2">
        {pairings.length === 0 ? (
          <div className="rounded-xl border bg-white px-4 py-10 text-center text-sm text-gray-400">
            No matches on this page.{" "}
            <Link href="/stats/history" className="text-green-700 hover:underline">
              Go to page 1
            </Link>
          </div>
        ) : (
          pairings.map((pairing) => (
            <MatchCard
              key={pairing.id}
              pairing={pairing}
              userId={userId}
              userNameMap={userNameMap}
              userPictureMap={userPictureMap}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          {hasPrev ? (
            <Link
              href={`/stats/history?page=${currentPage - 1}`}
              className="flex h-11 min-w-[100px] items-center justify-center rounded-xl border bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Previous
            </Link>
          ) : (
            <span className="flex h-11 min-w-[100px] items-center justify-center rounded-xl border bg-gray-50 px-4 text-sm text-gray-300">
              ← Previous
            </span>
          )}

          <span className="text-xs text-gray-400">
            {currentPage} / {totalPages}
          </span>

          {hasNext ? (
            <Link
              href={`/stats/history?page=${currentPage + 1}`}
              className="flex h-11 min-w-[100px] items-center justify-center rounded-xl border bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Next →
            </Link>
          ) : (
            <span className="flex h-11 min-w-[100px] items-center justify-center rounded-xl border bg-gray-50 px-4 text-sm text-gray-300">
              Next →
            </span>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
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

function MatchRow({
  pairing,
  userId,
  userNameMap,
  userPictureMap,
  expanded,
  onToggle,
}: {
  pairing: PairingFull;
  userId: string;
  userNameMap: Record<string, string>;
  userPictureMap: Record<string, string | null>;
  expanded: boolean;
  onToggle: () => void;
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
  const oppNames = oppTeam.map(getName);

  const myScore = result
    ? onA
      ? result.team_a_score
      : result.team_b_score
    : null;
  const oppScore = result
    ? onA
      ? result.team_b_score
      : result.team_a_score
    : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-shadow",
        won === true && "border-green-200",
        won === false && "border-red-100",
        won === null && "border-gray-200"
      )}
    >
      {/* Main row — tappable */}
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-3 text-left",
          won === true && "bg-green-50",
          won === false && "bg-red-50",
          won === null && "bg-white"
        )}
        aria-expanded={expanded}
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

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-gray-900">
              {pairing.sessions?.name ?? "Unknown session"}
            </p>
          </div>
          <p className="truncate text-xs text-gray-400">
            {pairing.completed_at
              ? format(new Date(pairing.completed_at), "d MMM yyyy · h:mm a")
              : pairing.sessions?.date
                ? format(new Date(pairing.sessions.date), "d MMM yyyy")
                : "Unknown date"}
          </p>
        </div>

        {/* Score + expand chevron */}
        <div className="flex shrink-0 items-center gap-2">
          {myScore !== null && oppScore !== null && (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-sm font-bold tabular-nums",
                won === true && "bg-green-100 text-green-700",
                won === false && "bg-red-100 text-red-600",
                won === null && "bg-gray-100 text-gray-600"
              )}
            >
              {myScore}–{oppScore}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className={cn(
            "border-t px-3 py-3",
            won === true && "border-green-100 bg-green-50/60",
            won === false && "border-red-100 bg-red-50/60",
            won === null && "border-gray-100 bg-gray-50"
          )}
        >
          <div className="space-y-2">
            {/* Court */}
            <p className="text-xs text-gray-400">
              Court {pairing.court_number}
              {pairing.sessions?.name && (
                <> · {pairing.sessions.name}</>
              )}
            </p>

            {/* Teams */}
            <div className="space-y-1.5">
              {/* My team */}
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-medium text-gray-500">You &amp; partner</span>
                <div className="flex items-center gap-1.5">
                  <PlayerAvatar
                    pictureUrl={userPictureMap[userId] ?? null}
                    displayName={userNameMap[userId] ?? "You"}
                  />
                  {partner && (
                    <>
                      <span className="text-xs text-gray-300">&amp;</span>
                      <PlayerAvatar
                        pictureUrl={getPicture(partner)}
                        displayName={partnerName}
                      />
                    </>
                  )}
                  <span className="ml-0.5 text-xs text-gray-600">
                    {userNameMap[userId] ?? "You"}
                    {partner && ` & ${partnerName}`}
                  </span>
                </div>
              </div>

              {/* Opponents */}
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-medium text-gray-500">Opponents</span>
                <div className="flex items-center gap-1.5">
                  {oppTeam.filter((id): id is string => id != null).map((id) => (
                    <PlayerAvatar
                      key={id}
                      pictureUrl={getPicture(id)}
                      displayName={getName(id)}
                    />
                  ))}
                  <span className="ml-0.5 text-xs text-gray-600">{oppNames.join(" & ")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

      {/* Match rows */}
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
            <MatchRow
              key={pairing.id}
              pairing={pairing}
              userId={userId}
              userNameMap={userNameMap}
              userPictureMap={userPictureMap}
              expanded={expandedId === pairing.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === pairing.id ? null : pairing.id))
              }
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

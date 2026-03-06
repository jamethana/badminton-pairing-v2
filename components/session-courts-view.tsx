"use client";

import CourtCard from "@/components/court-card";
import type { Tables } from "@/types/database";

type Pairing = Tables<"pairings"> & {
  game_results?: Tables<"game_results"> | null;
};
type SessionPlayer = Tables<"session_players"> & {
  users: Tables<"users"> | null;
};

interface SessionCourtsViewProps {
  numCourts: number;
  courtNames?: Record<string, string>;
  pairings: Pairing[];
  sessionPlayers: SessionPlayer[];
  /** Text shown on available courts (no players assigned). */
  emptyCourtText?: string;
  /** Called when an empty (available) court is clicked. Omit to make empty courts non-interactive. */
  onEmptyCourtClick?: (courtNumber: number) => void;
  /** Called when an in-progress court is clicked. Omit to make in-progress courts non-interactive. */
  onInProgressCourtClick?: (courtNumber: number, pairingId: string) => void;
  /** Highlight the court that the current user is playing on. */
  currentUserId?: string;
}

function getCourtPairing(pairings: Pairing[], courtNumber: number) {
  return pairings.find(
    (p) => p.court_number === courtNumber && p.status === "in_progress"
  );
}

export default function SessionCourtsView({
  numCourts,
  courtNames = {},
  pairings,
  sessionPlayers,
  emptyCourtText,
  onEmptyCourtClick,
  onInProgressCourtClick,
  currentUserId,
}: SessionCourtsViewProps) {
  const courts = Array.from({ length: numCourts }, (_, i) => i + 1);

  const getPlayerById = (id: string) =>
    sessionPlayers.find((sp) => sp.users?.id === id)?.users ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {courts.map((courtNumber) => {
        const pairing = getCourtPairing(pairings, courtNumber);
        const isPending = pairing?.id.startsWith("temp-");
        const courtLabel = courtNames[String(courtNumber)];

        const isMyGame =
          currentUserId && pairing
            ? [
                pairing.team_a_player_1,
                pairing.team_a_player_2,
                pairing.team_b_player_1,
                pairing.team_b_player_2,
              ].includes(currentUserId)
            : false;

        const teamA = pairing
          ? ([
              getPlayerById(pairing.team_a_player_1),
              getPlayerById(pairing.team_a_player_2),
            ] as [ReturnType<typeof getPlayerById>, ReturnType<typeof getPlayerById>])
          : undefined;

        const teamB = pairing
          ? ([
              getPlayerById(pairing.team_b_player_1),
              getPlayerById(pairing.team_b_player_2),
            ] as [ReturnType<typeof getPlayerById>, ReturnType<typeof getPlayerById>])
          : undefined;

        const handleClick = pairing
          ? onInProgressCourtClick && !isPending
            ? () => onInProgressCourtClick(courtNumber, pairing.id)
            : undefined
          : onEmptyCourtClick
          ? () => onEmptyCourtClick(courtNumber)
          : undefined;

        return (
          <CourtCard
            key={courtNumber}
            courtNumber={courtNumber}
            courtLabel={courtLabel}
            teamA={
              teamA && teamA[0] && teamA[1]
                ? (teamA as [NonNullable<typeof teamA[0]>, NonNullable<typeof teamA[1]>])
                : undefined
            }
            teamB={
              teamB && teamB[0] && teamB[1]
                ? (teamB as [NonNullable<typeof teamB[0]>, NonNullable<typeof teamB[1]>])
                : undefined
            }
            status={pairing ? "in_progress" : "available"}
            isPending={isPending}
            emptyStateText={pairing ? undefined : emptyCourtText}
            onClick={handleClick}
            className={isMyGame ? "ring-2 ring-green-400" : undefined}
          />
        );
      })}
    </div>
  );
}

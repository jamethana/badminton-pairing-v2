"use client";

import CourtCard from "@/components/court-card";
import { getDeletedUserPlaceholder } from "@/lib/utils/deleted-user";
import type { Tables } from "@/types/database";

type Pairing = Tables<"pairings"> & {
  game_results?: Tables<"game_results"> | null;
};
type SessionPlayer = Tables<"session_players"> & {
  users: Tables<"users"> | null;
};

type PlayerInfo = {
  id: string;
  display_name: string;
  skill_level: number;
  picture_url?: string | null;
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

  const getPlayerById = (id: string | null) => {
    if (id == null) return getDeletedUserPlaceholder();
    const user = sessionPlayers.find((sp) => sp.users?.id === id)?.users ?? null;
    return user ?? getDeletedUserPlaceholder();
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {courts.map((courtNumber) => {
        const pairing = getCourtPairing(pairings, courtNumber);
        const isPending = pairing?.id.startsWith("temp-");
        const courtLabel = courtNames[String(courtNumber)];

        const playerIds = pairing
          ? [
              pairing.team_a_player_1,
              pairing.team_a_player_2,
              pairing.team_b_player_1,
              pairing.team_b_player_2,
            ].filter((id): id is string => id != null)
          : [];
        const isMyGame =
          currentUserId != null && pairing ? playerIds.includes(currentUserId) : false;

        const teamA = pairing
          ? ([getPlayerById(pairing.team_a_player_1), getPlayerById(pairing.team_a_player_2)] as const)
          : undefined;

        const teamB = pairing
          ? ([getPlayerById(pairing.team_b_player_1), getPlayerById(pairing.team_b_player_2)] as const)
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
            teamA={teamA as [PlayerInfo, PlayerInfo] | undefined}
            teamB={teamB as [PlayerInfo, PlayerInfo] | undefined}
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

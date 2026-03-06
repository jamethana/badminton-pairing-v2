import type { Tables } from "@/types/database";

export type PairingWithResult = Tables<"pairings"> & {
  game_results?: Tables<"game_results"> | null;
};

export interface PlayerStats {
  userId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesSinceLastPlayed: number;
}

/**
 * Computes per-player statistics from all pairings in a session.
 * gamesSinceLastPlayed = number of completed games across all courts
 * after the player's last played game.
 */
export function computePlayerStats(
  pairings: PairingWithResult[],
  sessionPlayerIds: string[]
): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>();

  for (const pid of sessionPlayerIds) {
    stats.set(pid, {
      userId: pid,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      gamesSinceLastPlayed: 0,
    });
  }

  // Only count completed pairings for match counts/wins (ignore null slots — deleted user)
  const completed = pairings.filter((p) => p.status === "completed");
  for (const p of completed) {
    const teamA = [p.team_a_player_1, p.team_a_player_2].filter((id): id is string => id != null);
    const teamB = [p.team_b_player_1, p.team_b_player_2].filter((id): id is string => id != null);
    const allPlayers = [...teamA, ...teamB];
    const result = p.game_results;

    for (const pid of allPlayers) {
      const s = stats.get(pid);
      if (!s) continue;
      s.matchesPlayed++;
      if (result?.winner_team) {
        const onTeamA = teamA.includes(pid);
        const won =
          (onTeamA && result.winner_team === "team_a") ||
          (!onTeamA && result.winner_team === "team_b");
        if (won) s.wins++;
        else s.losses++;
      }
    }
  }

  // Compute gamesSinceLastPlayed:
  // Sort all non-voided pairings by sequence_number
  const nonVoided = pairings
    .filter((p) => p.status !== "voided")
    .sort((a, b) => a.sequence_number - b.sequence_number);

  const totalCompleted = nonVoided.filter((p) => p.status === "completed").length;

  for (const [pid, s] of stats) {
    // Find the last sequence_number where this player played (completed game)
    let lastSeqPlayed = -1;
    for (const p of completed) {
      const players = [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2].filter(
        (id): id is string => id != null
      );
      if (players.includes(pid)) {
        if (p.sequence_number > lastSeqPlayed) {
          lastSeqPlayed = p.sequence_number;
        }
      }
    }

    if (lastSeqPlayed === -1) {
      // Never played — sat for all completed games
      s.gamesSinceLastPlayed = totalCompleted;
    } else {
      // Count completed games after lastSeqPlayed
      s.gamesSinceLastPlayed = completed.filter(
        (p) => p.sequence_number > lastSeqPlayed
      ).length;
    }
  }

  return stats;
}

export function getPlayersInCurrentGame(pairings: PairingWithResult[]): Set<string> {
  const inProgress = pairings.filter((p) => p.status === "in_progress");
  const busy = new Set<string>();
  for (const p of inProgress) {
    const ids = [
      p.team_a_player_1,
      p.team_a_player_2,
      p.team_b_player_1,
      p.team_b_player_2,
    ].filter((id): id is string => id != null);
    ids.forEach((id) => busy.add(id));
  }
  return busy;
}

import type { Tables } from "@/types/database";

type Pairing = Tables<"pairings">;

export interface PlayerStats {
  userId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesSinceLastPlayed: number;
}

/**
 * Computes per-player statistics from all pairings in a session.
 * gamesSinceLastPlayed = number of completed+voided games across all courts
 * after the player's last played game.
 */
export function computePlayerStats(
  pairings: Pairing[],
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

  // Only count completed pairings for match counts/wins
  const completed = pairings.filter((p) => p.status === "completed");
  for (const p of completed) {
    const players = [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2];
    for (const pid of players) {
      const s = stats.get(pid);
      if (s) s.matchesPlayed++;
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
      const players = [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2];
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

export function getPlayersInCurrentGame(pairings: Pairing[]): Set<string> {
  const inProgress = pairings.filter((p) => p.status === "in_progress");
  const busy = new Set<string>();
  for (const p of inProgress) {
    busy.add(p.team_a_player_1);
    busy.add(p.team_a_player_2);
    busy.add(p.team_b_player_1);
    busy.add(p.team_b_player_2);
  }
  return busy;
}

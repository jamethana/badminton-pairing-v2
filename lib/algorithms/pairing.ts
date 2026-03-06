import type { Tables } from "@/types/database";
import { computePlayerStats, getPlayersInCurrentGame } from "@/lib/utils/session-stats";

type UserRow = Tables<"users">;
type Pairing = Tables<"pairings">;

export interface PlayerWithStats {
  user: UserRow;
  matchesPlayed: number;
  gamesSinceLastPlayed: number;
}

export interface TeamAssignment {
  teamA: [string, string];
  teamB: [string, string];
  score: number;
}

/**
 * Generates a pairing suggestion for a given court.
 * Returns the 4 selected players and their team assignment.
 */
export function generatePairing(
  activePlayers: UserRow[],
  allPairings: Pairing[],
  courtNumber: number
): TeamAssignment | null {
  const busyPlayerIds = getPlayersInCurrentGame(allPairings);

  // Filter out players already in a game
  const available = activePlayers.filter((p) => !busyPlayerIds.has(p.id));

  if (available.length < 4) return null;

  const playerIds = available.map((p) => p.id);
  const statsMap = computePlayerStats(allPairings, playerIds);

  // Sort by priority: sitting time (desc), then matches played (asc)
  const sorted = [...available].sort((a, b) => {
    const sa = statsMap.get(a.id)!;
    const sb = statsMap.get(b.id)!;
    // Higher sitting priority first
    if (sb.gamesSinceLastPlayed !== sa.gamesSinceLastPlayed) {
      return sb.gamesSinceLastPlayed - sa.gamesSinceLastPlayed;
    }
    // Lower match count next
    return sa.matchesPlayed - sb.matchesPlayed;
  });

  // Pick top 8 candidates (or all if fewer), then find best 4-player combo
  const candidates = sorted.slice(0, Math.min(8, sorted.length));

  // Build partner/opponent history maps
  const partnerHistory = new Map<string, Set<string>>();
  const opponentHistory = new Map<string, Set<string>>();
  for (const p of activePlayers) {
    partnerHistory.set(p.id, new Set());
    opponentHistory.set(p.id, new Set());
  }
  for (const pairing of allPairings) {
    if (pairing.status === "voided") continue;
    const teamA = [pairing.team_a_player_1, pairing.team_a_player_2].filter(
      (id): id is string => id != null
    );
    const teamB = [pairing.team_b_player_1, pairing.team_b_player_2].filter(
      (id): id is string => id != null
    );

    // Partners (only when both slots are non-null)
    if (teamA.length === 2 && partnerHistory.has(teamA[0]) && partnerHistory.has(teamA[1])) {
      partnerHistory.get(teamA[0])!.add(teamA[1]);
      partnerHistory.get(teamA[1])!.add(teamA[0]);
    }
    if (teamB.length === 2 && partnerHistory.has(teamB[0]) && partnerHistory.has(teamB[1])) {
      partnerHistory.get(teamB[0])!.add(teamB[1]);
      partnerHistory.get(teamB[1])!.add(teamB[0]);
    }
    // Opponents
    for (const a of teamA) {
      for (const b of teamB) {
        if (opponentHistory.has(a) && opponentHistory.has(b)) {
          opponentHistory.get(a)!.add(b);
          opponentHistory.get(b)!.add(a);
        }
      }
    }
  }

  // Keep a small pool of near-best assignments so we can add a touch of
  // randomness without sacrificing quality.
  let bestScore = -Infinity;
  const topAssignments: TeamAssignment[] = [];

  // Try all combinations of 4 from top candidates
  const n = candidates.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const group = [candidates[i], candidates[j], candidates[k], candidates[l]];

          // Try all 3 ways to split 4 into 2v2
          const splits: [[number, number], [number, number]][] = [
            [[0, 1], [2, 3]],
            [[0, 2], [1, 3]],
            [[0, 3], [1, 2]],
          ];

          for (const [[a1, a2], [b1, b2]] of splits) {
            const pA = group[a1];
            const pB = group[a2];
            const pC = group[b1];
            const pD = group[b2];

            const score = scoreAssignment(
              pA, pB, pC, pD,
              statsMap,
              partnerHistory,
              opponentHistory
            );

            if (score > bestScore) {
              bestScore = score;
              topAssignments.length = 0;
              topAssignments.push({
                teamA: [pA.id, pB.id],
                teamB: [pC.id, pD.id],
                score,
              });
            } else if (score === bestScore || score > bestScore - 5) {
              // Within a small margin of the best score: keep as an alternative.
              topAssignments.push({
                teamA: [pA.id, pB.id],
                teamB: [pC.id, pD.id],
                score,
              });
            }
          }
        }
      }
    }
  }

  void courtNumber; // used by caller for logging

  if (topAssignments.length === 0) return null;

  // Pick a random assignment from the near-best pool so repeated generations
  // don't always look identical, while still staying high quality.
  const randomIndex = Math.floor(Math.random() * topAssignments.length);
  return topAssignments[randomIndex];
}

function scoreAssignment(
  a1: UserRow,
  a2: UserRow,
  b1: UserRow,
  b2: UserRow,
  statsMap: Map<string, { matchesPlayed: number; gamesSinceLastPlayed: number }>,
  partnerHistory: Map<string, Set<string>>,
  opponentHistory: Map<string, Set<string>>
): number {
  let score = 0;

  // 1. Skill balance (higher weight) — lower diff is better
  const teamASkill = a1.skill_level + a2.skill_level;
  const teamBSkill = b1.skill_level + b2.skill_level;
  const skillDiff = Math.abs(teamASkill - teamBSkill);
  score -= skillDiff * 10;

  // 2. Partner variety — prefer new partners
  const newPartnerA = !partnerHistory.get(a1.id)?.has(a2.id) ? 1 : 0;
  const newPartnerB = !partnerHistory.get(b1.id)?.has(b2.id) ? 1 : 0;
  score += (newPartnerA + newPartnerB) * 5;

  // 3. Opponent variety — prefer new opponents
  const opponentPairs = [
    [a1.id, b1.id], [a1.id, b2.id], [a2.id, b1.id], [a2.id, b2.id],
  ];
  let newOpponents = 0;
  for (const [x, y] of opponentPairs) {
    if (!opponentHistory.get(x)?.has(y)) newOpponents++;
  }
  score += newOpponents * 2;

  // 4. Sitting fairness bonus (all 4 should have some sitting time)
  const sa1 = statsMap.get(a1.id)?.gamesSinceLastPlayed ?? 0;
  const sa2 = statsMap.get(a2.id)?.gamesSinceLastPlayed ?? 0;
  const sb1 = statsMap.get(b1.id)?.gamesSinceLastPlayed ?? 0;
  const sb2 = statsMap.get(b2.id)?.gamesSinceLastPlayed ?? 0;
  score += (sa1 + sa2 + sb1 + sb2) * 3;

  return score;
}

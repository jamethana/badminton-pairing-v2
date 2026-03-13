import type { PairingRule, Tables } from "@/types/database";
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

export interface PairingOptions {
  pairingRule?: PairingRule;
  maxPartnerSkillLevelGap?: number;
}

/**
 * Generates a pairing suggestion for a given court.
 * Returns the 4 selected players and their team assignment, or null if not enough players.
 */
export function generatePairing(
  activePlayers: UserRow[],
  allPairings: Pairing[],
  courtNumber: number,
  options: PairingOptions = {}
): TeamAssignment | null {
  const { pairingRule = "least_played", maxPartnerSkillLevelGap = 2 } = options;

  const busyPlayerIds = getPlayersInCurrentGame(allPairings);
  const available = activePlayers.filter((p) => !busyPlayerIds.has(p.id));

  if (available.length < 4) return null;

  const playerIds = available.map((p) => p.id);
  const statsMap = computePlayerStats(allPairings, playerIds);

  // Sort candidates according to the selected pairing rule.
  const sorted = [...available].sort((a, b) => {
    const sa = statsMap.get(a.id)!;
    const sb = statsMap.get(b.id)!;

    if (pairingRule === "least_played") {
      // Primary: fewest matches played (ascending); tiebreak: longest wait (descending)
      if (sa.matchesPlayed !== sb.matchesPlayed) return sa.matchesPlayed - sb.matchesPlayed;
      return sb.gamesSinceLastPlayed - sa.gamesSinceLastPlayed;
    }

    if (pairingRule === "longest_wait") {
      // Primary: longest sitting time (descending); tiebreak: fewest matches (ascending)
      if (sb.gamesSinceLastPlayed !== sa.gamesSinceLastPlayed) {
        return sb.gamesSinceLastPlayed - sa.gamesSinceLastPlayed;
      }
      return sa.matchesPlayed - sb.matchesPlayed;
    }

    // "balanced": equal weight on matches played and wait time
    const scoreA = sa.gamesSinceLastPlayed * 3 - sa.matchesPlayed * 3;
    const scoreB = sb.gamesSinceLastPlayed * 3 - sb.matchesPlayed * 3;
    return scoreB - scoreA;
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

    if (teamA.length === 2 && partnerHistory.has(teamA[0]) && partnerHistory.has(teamA[1])) {
      partnerHistory.get(teamA[0])!.add(teamA[1]);
      partnerHistory.get(teamA[1])!.add(teamA[0]);
    }
    if (teamB.length === 2 && partnerHistory.has(teamB[0]) && partnerHistory.has(teamB[1])) {
      partnerHistory.get(teamB[0])!.add(teamB[1]);
      partnerHistory.get(teamB[1])!.add(teamB[0]);
    }
    for (const a of teamA) {
      for (const b of teamB) {
        if (opponentHistory.has(a) && opponentHistory.has(b)) {
          opponentHistory.get(a)!.add(b);
          opponentHistory.get(b)!.add(a);
        }
      }
    }
  }

  let bestScore = -Infinity;
  const topAssignments: TeamAssignment[] = [];

  const n = candidates.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const group = [candidates[i], candidates[j], candidates[k], candidates[l]];

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
              opponentHistory,
              pairingRule,
              maxPartnerSkillLevelGap
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

  void courtNumber;

  if (topAssignments.length === 0) return null;

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
  opponentHistory: Map<string, Set<string>>,
  pairingRule: PairingRule,
  maxPartnerSkillLevelGap: number
): number {
  let score = 0;

  // Partner skill gap constraint — heavy penalty when gap exceeds the limit.
  // maxPartnerSkillLevelGap === 10 means no restriction.
  if (maxPartnerSkillLevelGap < 10) {
    const gapA = Math.abs(a1.skill_level - a2.skill_level);
    const gapB = Math.abs(b1.skill_level - b2.skill_level);
    if (gapA > maxPartnerSkillLevelGap) score -= 500;
    if (gapB > maxPartnerSkillLevelGap) score -= 500;
  }

  // 1. Skill balance across teams
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

  // 4. Fairness/wait bonus — weights vary by pairing rule
  const sa1 = statsMap.get(a1.id)?.gamesSinceLastPlayed ?? 0;
  const sa2 = statsMap.get(a2.id)?.gamesSinceLastPlayed ?? 0;
  const sb1 = statsMap.get(b1.id)?.gamesSinceLastPlayed ?? 0;
  const sb2 = statsMap.get(b2.id)?.gamesSinceLastPlayed ?? 0;

  const ma1 = statsMap.get(a1.id)?.matchesPlayed ?? 0;
  const ma2 = statsMap.get(a2.id)?.matchesPlayed ?? 0;
  const mb1 = statsMap.get(b1.id)?.matchesPlayed ?? 0;
  const mb2 = statsMap.get(b2.id)?.matchesPlayed ?? 0;

  const totalWait = sa1 + sa2 + sb1 + sb2;
  const totalPlayed = ma1 + ma2 + mb1 + mb2;

  if (pairingRule === "least_played") {
    score += totalWait * 1;
    score -= totalPlayed * 5;
  } else if (pairingRule === "longest_wait") {
    score += totalWait * 5;
    score -= totalPlayed * 1;
  } else {
    // balanced
    score += totalWait * 3;
    score -= totalPlayed * 3;
  }

  return score;
}

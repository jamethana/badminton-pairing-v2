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

/** Rule weight profiles (wait, fairness, balance, variety) — all sum to 1.0 */
const WEIGHTS: Record<PairingRule, [number, number, number, number]> = {
  least_played: [0.1, 0.5, 0.25, 0.15],
  longest_wait: [0.5, 0.15, 0.2, 0.15],
  balanced: [0.25, 0.25, 0.3, 0.2],
};

const MAX_SKILL_GAP_CAP = 10;

/**
 * Generates a pairing suggestion for a given court.
 * Pure, deterministic function. Returns the highest-scoring assignment, or null if not enough players.
 *
 * Scoring: four 0–1 normalised signals (wait, fairness, balance, variety) combined with rule-specific weights.
 * Full enumeration over all C(n,4)×3 combinations; maxPartnerSkillLevelGap is a hard filter with graceful fallback.
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

  const { partnerCount, opponentCount } = buildPartnerOpponentCounts(allPairings, activePlayers);

  const poolContext = computePoolContext(available, statsMap);

  const weights = WEIGHTS[pairingRule];

  let best: TeamAssignment | null = null;
  let bestScore = -Infinity;

  for (let gap = maxPartnerSkillLevelGap; gap <= MAX_SKILL_GAP_CAP; gap++) {
    const result = findBestAssignment(
      available,
      statsMap,
      partnerCount,
      opponentCount,
      poolContext,
      weights,
      gap
    );
    if (result) {
      best = result;
      bestScore = result.score;
      break;
    }
  }

  if (!best) {
    best = findBestAssignment(
      available,
      statsMap,
      partnerCount,
      opponentCount,
      poolContext,
      weights,
      null
    );
  }

  void courtNumber;
  return best;
}

function buildPartnerOpponentCounts(
  allPairings: Pairing[],
  activePlayers: UserRow[]
): {
  partnerCount: Map<string, Map<string, number>>;
  opponentCount: Map<string, Map<string, number>>;
} {
  const partnerCount = new Map<string, Map<string, number>>();
  const opponentCount = new Map<string, Map<string, number>>();

  for (const p of activePlayers) {
    partnerCount.set(p.id, new Map());
    opponentCount.set(p.id, new Map());
  }

  for (const pairing of allPairings) {
    if (pairing.status === "voided") continue;
    const teamA = [pairing.team_a_player_1, pairing.team_a_player_2].filter(
      (id): id is string => id != null
    );
    const teamB = [pairing.team_b_player_1, pairing.team_b_player_2].filter(
      (id): id is string => id != null
    );

    if (teamA.length === 2 && partnerCount.has(teamA[0]) && partnerCount.has(teamA[1])) {
      incCount(partnerCount, teamA[0], teamA[1]);
      incCount(partnerCount, teamA[1], teamA[0]);
    }
    if (teamB.length === 2 && partnerCount.has(teamB[0]) && partnerCount.has(teamB[1])) {
      incCount(partnerCount, teamB[0], teamB[1]);
      incCount(partnerCount, teamB[1], teamB[0]);
    }
    for (const a of teamA) {
      for (const b of teamB) {
        if (opponentCount.has(a) && opponentCount.has(b)) {
          incCount(opponentCount, a, b);
          incCount(opponentCount, b, a);
        }
      }
    }
  }

  return { partnerCount, opponentCount };
}

function incCount(map: Map<string, Map<string, number>>, a: string, b: string): void {
  const inner = map.get(a)!;
  inner.set(b, (inner.get(b) ?? 0) + 1);
}

interface PoolContext {
  maxWaitRaw: number;
  maxMatchesPlayed: number;
  maxRatingSpread: number;
}

function computePoolContext(
  available: UserRow[],
  statsMap: Map<string, { matchesPlayed: number; gamesSinceLastPlayed: number }>
): PoolContext {
  const waitRaws = available
    .map((p) => Math.pow(2, statsMap.get(p.id)?.gamesSinceLastPlayed ?? 0))
    .sort((a, b) => b - a);
  const maxWaitRaw =
    waitRaws.length >= 4 ? waitRaws.slice(0, 4).reduce((s, v) => s + v, 0) : waitRaws.reduce((s, v) => s + v, 0) || 1;

  const maxMatchesPlayed =
    Math.max(0, ...available.map((p) => statsMap.get(p.id)?.matchesPlayed ?? 0)) || 1;

  const sorted = [...available].sort((a, b) => a.skill_level - b.skill_level);
  const maxRatingSpread =
    sorted.length >= 4
      ? sorted[sorted.length - 1].skill_level +
        sorted[sorted.length - 2].skill_level -
        sorted[0].skill_level -
        sorted[1].skill_level
      : 1;
  const spread = Math.max(1, maxRatingSpread);

  return { maxWaitRaw, maxMatchesPlayed, maxRatingSpread: spread };
}

function findBestAssignment(
  available: UserRow[],
  statsMap: Map<string, { matchesPlayed: number; gamesSinceLastPlayed: number }>,
  partnerCount: Map<string, Map<string, number>>,
  opponentCount: Map<string, Map<string, number>>,
  poolContext: PoolContext,
  weights: [number, number, number, number],
  maxGap: number | null
): TeamAssignment | null {
  let best: TeamAssignment | null = null;
  let bestScore = -Infinity;

  const n = available.length;
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const group = [available[i], available[j], available[k], available[l]];

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

            if (maxGap !== null) {
              const gapA = Math.abs(pA.skill_level - pB.skill_level);
              const gapB = Math.abs(pC.skill_level - pD.skill_level);
              if (gapA > maxGap || gapB > maxGap) continue;
            }

            const score = scoreAssignment(
              pA,
              pB,
              pC,
              pD,
              statsMap,
              partnerCount,
              opponentCount,
              poolContext,
              weights
            );

            if (score > bestScore) {
              bestScore = score;
              best = {
                teamA: [pA.id, pB.id],
                teamB: [pC.id, pD.id],
                score,
              };
            }
          }
        }
      }
    }
  }

  return best;
}

function scoreAssignment(
  a1: UserRow,
  a2: UserRow,
  b1: UserRow,
  b2: UserRow,
  statsMap: Map<string, { matchesPlayed: number; gamesSinceLastPlayed: number }>,
  partnerCount: Map<string, Map<string, number>>,
  opponentCount: Map<string, Map<string, number>>,
  poolContext: PoolContext,
  weights: [number, number, number, number]
): number {
  const { maxWaitRaw, maxMatchesPlayed, maxRatingSpread } = poolContext;

  const gslp = (id: string) => statsMap.get(id)?.gamesSinceLastPlayed ?? 0;
  const mp = (id: string) => statsMap.get(id)?.matchesPlayed ?? 0;

  const waitRaw =
    Math.pow(2, gslp(a1.id)) +
    Math.pow(2, gslp(a2.id)) +
    Math.pow(2, gslp(b1.id)) +
    Math.pow(2, gslp(b2.id));
  const wait = maxWaitRaw > 0 ? Math.min(1, waitRaw / maxWaitRaw) : 0;

  const fairnessRaw =
    (maxMatchesPlayed - mp(a1.id)) +
    (maxMatchesPlayed - mp(a2.id)) +
    (maxMatchesPlayed - mp(b1.id)) +
    (maxMatchesPlayed - mp(b2.id));
  const fairnessDenom = 4 * maxMatchesPlayed;
  const fairness = fairnessDenom > 0 ? Math.min(1, Math.max(0, fairnessRaw / fairnessDenom)) : 1;

  const teamASum = a1.skill_level + a2.skill_level;
  const teamBSum = b1.skill_level + b2.skill_level;
  const teamSumDiff = Math.abs(teamASum - teamBSum);
  const balance = Math.min(1, Math.max(0, 1 - teamSumDiff / maxRatingSpread));

  const getPartnerCount = (x: string, y: string) => partnerCount.get(x)?.get(y) ?? 0;
  const getOpponentCount = (x: string, y: string) => opponentCount.get(x)?.get(y) ?? 0;

  const partnerRepeat =
    getPartnerCount(a1.id, a2.id) + getPartnerCount(b1.id, b2.id);
  const opponentRepeat =
    getOpponentCount(a1.id, b1.id) +
    getOpponentCount(a1.id, b2.id) +
    getOpponentCount(a2.id, b1.id) +
    getOpponentCount(a2.id, b2.id);

  const repeatUnits = 2 * partnerRepeat + opponentRepeat;
  const variety = repeatUnits >= 8 ? 0 : 1 - repeatUnits / 8;

  const [wWait, wFair, wBal, wVar] = weights;
  return wWait * wait + wFair * fairness + wBal * balance + wVar * variety;
}

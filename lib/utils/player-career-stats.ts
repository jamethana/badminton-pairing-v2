import type { Tables } from "@/types/database";

export type PairingFull = Tables<"pairings"> & {
  game_results: Tables<"game_results"> | null;
  sessions: { id: string; name: string; date: string | null } | null;
};

export interface PartnerStat {
  partnerId: string;
  partnerName: string;
  games: number;
  wins: number;
}

export interface RivalStat {
  rivalId: string;
  rivalName: string;
  games: number;
  wins: number;
}

export interface SessionStat {
  sessionId: string;
  sessionName: string;
  sessionDate: string | null;
  played: number;
  wins: number;
  losses: number;
}

export interface CareerStats {
  played: number;
  wins: number;
  losses: number;
  /** 0-100, or null if no games played */
  winRate: number | null;
  currentStreak: { type: "W" | "L"; count: number } | null;
  bestWinStreak: number;
  sessionCount: number;
  avgGamesPerSession: number;
  topPartners: PartnerStat[];
  topRivals: RivalStat[];
  uniquePartners: number;
  uniqueOpponents: number;
  uniquePlayersMet: number;
  sessionBreakdown: SessionStat[];
  /** Most recent N games in descending order */
  recentGames: PairingFull[];
}

function onTeamA(p: PairingFull, userId: string): boolean {
  return p.team_a_player_1 === userId || p.team_a_player_2 === userId;
}

function isWinner(p: PairingFull, userId: string): boolean {
  if (!p.game_results?.winner_team) return false;
  const teamA = onTeamA(p, userId);
  return (
    (teamA && p.game_results.winner_team === "team_a") ||
    (!teamA && p.game_results.winner_team === "team_b")
  );
}

function getPartner(p: PairingFull, userId: string): string | null {
  if (onTeamA(p, userId)) {
    return p.team_a_player_1 === userId ? p.team_a_player_2 : p.team_a_player_1;
  }
  return p.team_b_player_1 === userId ? p.team_b_player_2 : p.team_b_player_1;
}

function getOpponents(p: PairingFull, userId: string): string[] {
  const opp = onTeamA(p, userId)
    ? [p.team_b_player_1, p.team_b_player_2]
    : [p.team_a_player_1, p.team_a_player_2];
  return opp.filter((id): id is string => id != null);
}

export function computeCareerStats(
  /** All completed pairings for this player, newest first */
  pairings: PairingFull[],
  userId: string,
  userNameMap: Map<string, string>
): CareerStats {
  const played = pairings.length;
  const wins = pairings.filter((p) => isWinner(p, userId)).length;
  const losses = played - wins;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : null;

  // Current streak (newest-first order)
  let streakType: "W" | "L" | null = null;
  let streakCount = 0;
  for (const p of pairings) {
    const type = isWinner(p, userId) ? "W" : "L";
    if (streakType === null) {
      streakType = type;
      streakCount = 1;
    } else if (type === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  // Best win streak (chronological order)
  let bestWinStreak = 0;
  let currentWin = 0;
  for (const p of [...pairings].reverse()) {
    if (isWinner(p, userId)) {
      currentWin++;
      if (currentWin > bestWinStreak) bestWinStreak = currentWin;
    } else {
      currentWin = 0;
    }
  }

  // Sessions
  const sessionMap = new Map<string, SessionStat>();
  for (const p of pairings) {
    const sid = p.session_id;
    if (!sessionMap.has(sid)) {
      sessionMap.set(sid, {
        sessionId: sid,
        sessionName: p.sessions?.name ?? "Unknown session",
        sessionDate: p.sessions?.date ?? null,
        played: 0,
        wins: 0,
        losses: 0,
      });
    }
    const ss = sessionMap.get(sid)!;
    ss.played++;
    if (isWinner(p, userId)) ss.wins++;
    else ss.losses++;
  }
  const sessionBreakdown = [...sessionMap.values()].sort((a, b) =>
    (b.sessionDate ?? "").localeCompare(a.sessionDate ?? "")
  );
  const sessionCount = sessionMap.size;
  const avgGamesPerSession = sessionCount > 0 ? Math.round((played / sessionCount) * 10) / 10 : 0;

  // Partners
  const partnerMap = new Map<string, { games: number; wins: number }>();
  for (const p of pairings) {
    const partnerId = getPartner(p, userId);
    if (!partnerId) continue;
    if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { games: 0, wins: 0 });
    const ps = partnerMap.get(partnerId)!;
    ps.games++;
    if (isWinner(p, userId)) ps.wins++;
  }
  const topPartners = [...partnerMap.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 1)
    .map(([pid, ps]) => ({
      partnerId: pid,
      partnerName: userNameMap.get(pid) ?? "Unknown",
      games: ps.games,
      wins: ps.wins,
    }));

  // Rivals
  const rivalMap = new Map<string, { games: number; wins: number }>();
  for (const p of pairings) {
    const opponents = getOpponents(p, userId);
    for (const rid of opponents) {
      if (!rivalMap.has(rid)) rivalMap.set(rid, { games: 0, wins: 0 });
      const rs = rivalMap.get(rid)!;
      rs.games++;
      if (isWinner(p, userId)) rs.wins++;
    }
  }
  const topRivals = [...rivalMap.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 1)
    .map(([rid, rs]) => ({
      rivalId: rid,
      rivalName: userNameMap.get(rid) ?? "Unknown",
      games: rs.games,
      wins: rs.wins,
    }));

  const uniquePartners = partnerMap.size;
  const uniqueOpponents = rivalMap.size;
  const uniquePlayersMet = new Set([...partnerMap.keys(), ...rivalMap.keys()]).size;

  return {
    played,
    wins,
    losses,
    winRate,
    currentStreak: streakType ? { type: streakType, count: streakCount } : null,
    bestWinStreak,
    sessionCount,
    avgGamesPerSession,
    topPartners,
    topRivals,
    uniquePartners,
    uniqueOpponents,
    uniquePlayersMet,
    sessionBreakdown,
    recentGames: pairings.slice(0, 10),
  };
}

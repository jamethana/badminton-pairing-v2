import { Rating, rate } from "ts-trueskill";
import type { Tables } from "@/types/database";

type UserRow = Tables<"users">;
type PairingRow = Tables<"pairings">;
type GameResultRow = Tables<"game_results">;

export interface TrueskillSnapshot {
  userId: string;
  mu: number;
  sigma: number;
}

const DEFAULT_MU = 25;
const DEFAULT_SIGMA = 8.333; // standard TrueSkill default (mu/3)

function getInitialRatingForUser(user: UserRow): Rating {
  // If we already have a TrueSkill state, reuse it, otherwise seed from
  // their configured skill_level.
  const mu =
    user.trueskill_mu ??
    (typeof user.skill_level === "number"
      ? DEFAULT_MU + (user.skill_level - 5) * 2
      : DEFAULT_MU);
  const sigma = user.trueskill_sigma ?? DEFAULT_SIGMA;
  return new Rating(mu, sigma);
}

export function computeTrueskillUpdateForCompletedGame(params: {
  usersById: Map<string, UserRow>;
  pairing: PairingRow;
  result: GameResultRow;
}): TrueskillSnapshot[] {
  const { usersById, pairing, result } = params;

  const a1 = usersById.get(pairing.team_a_player_1);
  const a2 = usersById.get(pairing.team_a_player_2);
  const b1 = usersById.get(pairing.team_b_player_1);
  const b2 = usersById.get(pairing.team_b_player_2);

  if (!a1 || !a2 || !b1 || !b2) return [];

  const teamA = [getInitialRatingForUser(a1), getInitialRatingForUser(a2)];
  const teamB = [getInitialRatingForUser(b1), getInitialRatingForUser(b2)];

  const teams =
    result.winner_team === "team_a"
      ? [teamA, teamB]
      : [teamB, teamA];

  const [ratedWinner, ratedLoser] = rate(teams);

  const ratedA = result.winner_team === "team_a" ? ratedWinner : ratedLoser;
  const ratedB = result.winner_team === "team_a" ? ratedLoser : ratedWinner;

  return [
    { userId: a1.id, mu: ratedA[0].mu, sigma: ratedA[0].sigma },
    { userId: a2.id, mu: ratedA[1].mu, sigma: ratedA[1].sigma },
    { userId: b1.id, mu: ratedB[0].mu, sigma: ratedB[0].sigma },
    { userId: b2.id, mu: ratedB[1].mu, sigma: ratedB[1].sigma },
  ];
}


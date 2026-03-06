import type { Tables } from "@/types/database";

type Session = Pick<
  Tables<"sessions">,
  | "allow_player_assign_empty_court"
  | "allow_player_record_own_result"
  | "allow_player_record_any_result"
>;

type Pairing = Pick<
  Tables<"pairings">,
  "team_a_player_1" | "team_a_player_2" | "team_b_player_1" | "team_b_player_2"
>;

/** True if the user may assign players to an empty court in this session. */
export function canAssignCourt({
  isModerator,
  session,
}: {
  isModerator: boolean;
  session: Session;
}): boolean {
  return isModerator || session.allow_player_assign_empty_court;
}

/** True if the user may record the result of a pairing they are playing in. */
export function canRecordOwnResult({
  isModerator,
  session,
  pairing,
  userId,
}: {
  isModerator: boolean;
  session: Session;
  pairing: Pairing;
  userId: string;
}): boolean {
  if (isModerator) return true;
  const playerIds = [
    pairing.team_a_player_1,
    pairing.team_a_player_2,
    pairing.team_b_player_1,
    pairing.team_b_player_2,
  ].filter((id): id is string => id != null);
  const isParticipant = playerIds.includes(userId);
  return (
    isParticipant &&
    (session.allow_player_record_own_result || session.allow_player_record_any_result)
  );
}

/** True if the user may record the result of any pairing in the session. */
export function canRecordAnyResult({
  isModerator,
  session,
}: {
  isModerator: boolean;
  session: Session;
}): boolean {
  return isModerator || session.allow_player_record_any_result;
}

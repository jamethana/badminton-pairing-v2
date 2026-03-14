import { describe, it, expect } from "vitest";
import { generatePairing } from "./pairing";
import type { Tables } from "@/types/database";

type UserRow = Tables<"users">;
type Pairing = Tables<"pairings">;

function mkUser(id: string, skillLevel: number): UserRow {
  return {
    id,
    display_name: `User ${id}`,
    skill_level: skillLevel,
    line_user_id: null,
    picture_url: null,
    calculated_skill_rating: null,
    is_moderator: false,
    auth_secret: null,
    trueskill_mu: null,
    trueskill_sigma: null,
    trueskill_updated_at: null,
    created_at: "",
    updated_at: "",
  };
}

function mkPairing(
  seq: number,
  status: "in_progress" | "completed" | "voided",
  teamA: [string, string],
  teamB: [string, string]
): Pairing {
  return {
    id: `pair-${seq}`,
    session_id: "sess-1",
    court_number: 1,
    sequence_number: seq,
    status,
    team_a_player_1: teamA[0],
    team_a_player_2: teamA[1],
    team_b_player_1: teamB[0],
    team_b_player_2: teamB[1],
    created_at: "",
    completed_at: status === "completed" ? "" : null,
  };
}

describe("generatePairing", () => {
  it("returns null when fewer than 4 available players", () => {
    const players = [
      mkUser("p1", 5),
      mkUser("p2", 5),
      mkUser("p3", 5),
    ];
    const result = generatePairing(players, [], 1);
    expect(result).toBeNull();
  });

  it("returns null when exactly 4 players but all are in an in_progress game", () => {
    const players = [
      mkUser("p1", 5),
      mkUser("p2", 5),
      mkUser("p3", 5),
      mkUser("p4", 5),
    ];
    const pairings = [
      mkPairing(1, "in_progress", ["p1", "p2"], ["p3", "p4"]),
    ];
    const result = generatePairing(players, pairings, 1);
    expect(result).toBeNull();
  });

  it("returns a valid assignment when 4 available players and no pairings", () => {
    const players = [
      mkUser("p1", 5),
      mkUser("p2", 5),
      mkUser("p3", 5),
      mkUser("p4", 5),
    ];
    const result = generatePairing(players, [], 1);
    expect(result).not.toBeNull();
    expect(result!.teamA).toHaveLength(2);
    expect(result!.teamB).toHaveLength(2);
    const allIds = [...result!.teamA, ...result!.teamB];
    expect(new Set(allIds).size).toBe(4);
    expect(allIds).toContain("p1");
    expect(allIds).toContain("p2");
    expect(allIds).toContain("p3");
    expect(allIds).toContain("p4");
  });

  it("respects maxPartnerSkillLevelGap as hard filter", () => {
    const players = [
      mkUser("p1", 1),
      mkUser("p2", 2),
      mkUser("p3", 9),
      mkUser("p4", 10),
    ];
    const result = generatePairing(players, [], 1, {
      pairingRule: "balanced",
      maxPartnerSkillLevelGap: 1,
    });
    expect(result).not.toBeNull();
    const [a1, a2] = result!.teamA;
    const [b1, b2] = result!.teamB;
    const getSkill = (id: string) => players.find((p) => p.id === id)!.skill_level;
    expect(Math.abs(getSkill(a1) - getSkill(a2))).toBeLessThanOrEqual(1);
    expect(Math.abs(getSkill(b1) - getSkill(b2))).toBeLessThanOrEqual(1);
  });

  it("relaxes skill gap when no valid assignment at strict gap", () => {
    const players = [
      mkUser("p1", 1),
      mkUser("p2", 2),
      mkUser("p3", 9),
      mkUser("p4", 10),
    ];
    const result = generatePairing(players, [], 1, {
      pairingRule: "balanced",
      maxPartnerSkillLevelGap: 1,
    });
    expect(result).not.toBeNull();
    const [a1, a2] = result!.teamA;
    const [b1, b2] = result!.teamB;
    const getSkill = (id: string) => players.find((p) => p.id === id)!.skill_level;
    expect(Math.abs(getSkill(a1) - getSkill(a2))).toBeLessThanOrEqual(1);
    expect(Math.abs(getSkill(b1) - getSkill(b2))).toBeLessThanOrEqual(1);
  });

  it("returns deterministic result for same inputs", () => {
    const players = [
      mkUser("p1", 5),
      mkUser("p2", 5),
      mkUser("p3", 5),
      mkUser("p4", 5),
    ];
    const r1 = generatePairing(players, [], 1);
    const r2 = generatePairing(players, [], 1);
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r1!.teamA).toEqual(r2!.teamA);
    expect(r1!.teamB).toEqual(r2!.teamB);
    expect(r1!.score).toBe(r2!.score);
  });

  it("prioritises least-played players when rule is least_played", () => {
    const players = [
      mkUser("p1", 5),
      mkUser("p2", 5),
      mkUser("p3", 5),
      mkUser("p4", 5),
      mkUser("p5", 5),
      mkUser("p6", 5),
    ];
    const pairings = [
      mkPairing(1, "completed", ["p1", "p2"], ["p3", "p4"]),
      mkPairing(2, "completed", ["p1", "p3"], ["p2", "p4"]),
      mkPairing(3, "completed", ["p1", "p4"], ["p2", "p3"]),
    ];
    const result = generatePairing(players, pairings, 1, {
      pairingRule: "least_played",
      maxPartnerSkillLevelGap: 10,
    });
    expect(result).not.toBeNull();
    const allIds = [...result!.teamA, ...result!.teamB];
    expect(allIds).toContain("p5");
    expect(allIds).toContain("p6");
  });

  it("excludes players in in_progress pairings from available pool", () => {
    const players = [
      mkUser("p1", 5),
      mkUser("p2", 5),
      mkUser("p3", 5),
      mkUser("p4", 5),
      mkUser("p5", 5),
      mkUser("p6", 5),
      mkUser("p7", 5),
      mkUser("p8", 5),
    ];
    const pairings = [
      mkPairing(1, "in_progress", ["p1", "p2"], ["p3", "p4"]),
    ];
    const result = generatePairing(players, pairings, 1);
    expect(result).not.toBeNull();
    const allIds = [...result!.teamA, ...result!.teamB];
    expect(allIds).not.toContain("p1");
    expect(allIds).not.toContain("p2");
    expect(allIds).not.toContain("p3");
    expect(allIds).not.toContain("p4");
    expect(allIds).toContain("p5");
    expect(allIds).toContain("p6");
  });
});

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";
import ResultModal from "@/components/result-modal";
import { computePlayerStats } from "@/lib/utils/session-stats";
import type { Tables } from "@/types/database";

type Session = Tables<"sessions">;
type Pairing = Tables<"pairings"> & {
  game_results?: Tables<"game_results"> | null;
};
type SessionPlayer = Tables<"session_players"> & {
  users: Tables<"users"> | null;
};

interface Props {
  session: Session;
  sessionPlayers: SessionPlayer[];
  pairings: Pairing[];
  currentUserId: string;
  mySlot: SessionPlayer | null;
  unclaimedSlots: SessionPlayer[];
}

export default function PlayerSessionClient({
  session,
  sessionPlayers,
  pairings: initialPairings,
  currentUserId,
  mySlot: initialMySlot,
  unclaimedSlots: initialUnclaimed,
}: Props) {
  const [pairings, setPairings] = useState(initialPairings);
  const [mySlot, setMySlot] = useState(initialMySlot);
  const [unclaimedSlots, setUnclaimedSlots] = useState(initialUnclaimed);
  const [allPlayers, setAllPlayers] = useState(sessionPlayers);
  const [claiming, setClaiming] = useState(false);
  const [resultModal, setResultModal] = useState<{ pairingId: string } | null>(null);

  const statsMap = computePlayerStats(
    pairings,
    allPlayers.map((sp) => sp.users?.id).filter((id): id is string => id !== null)
  );

  // Current game for me
  const myCurrentGame = mySlot
    ? pairings.find(
        (p) =>
          p.status === "in_progress" &&
          [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2].includes(
            currentUserId
          )
      )
    : null;

  const myTeam = myCurrentGame
    ? [myCurrentGame.team_a_player_1, myCurrentGame.team_a_player_2].includes(currentUserId)
      ? "A"
      : "B"
    : null;

  const getPlayer = (id: string) =>
    allPlayers.find((sp) => sp.users?.id === id)?.users ?? null;

  const handleClaim = async (slotId: string) => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_player_id: slotId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMySlot(updated);
        setUnclaimedSlots((prev) => prev.filter((s) => s.id !== slotId));
        setAllPlayers((prev) =>
          prev.map((sp) => (sp.id === slotId ? updated : sp))
        );
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleToggleActive = async () => {
    if (!mySlot) return;
    const res = await fetch(`/api/sessions/${session.id}/players/${mySlot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !mySlot.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMySlot(updated);
      setAllPlayers((prev) => prev.map((sp) => (sp.id === mySlot.id ? updated : sp)));
    }
  };

  const handleRecordResult = async (result: {
    team_a_score: number;
    team_b_score: number;
    winner_team: "team_a" | "team_b";
  }) => {
    if (!resultModal) return;
    const res = await fetch(
      `/api/sessions/${session.id}/pairings/${resultModal.pairingId}/results`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }
    );
    if (res.ok) {
      setPairings((prev) =>
        prev.map((p) =>
          p.id === resultModal.pairingId
            ? { ...p, status: "completed", completed_at: new Date().toISOString() }
            : p
        )
      );
    }
    setResultModal(null);
  };

  const myStats = mySlot ? statsMap.get(currentUserId) : null;
  const inProgressPairings = pairings.filter((p) => p.status === "in_progress");
  const completedPairings = pairings.filter((p) => p.status === "completed");

  return (
    <div className="space-y-4">
      {/* Claim slot section */}
      {!mySlot && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-800">Claim Your Slot</h2>
          {unclaimedSlots.length > 0 ? (
            <>
              <p className="mb-3 text-sm text-gray-500">
                Tap your name to link your LINE account:
              </p>
              <div className="space-y-2">
                {unclaimedSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleClaim(slot.id)}
                    disabled={claiming}
                    className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 hover:bg-green-50 hover:border-green-400 transition-colors disabled:opacity-60"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white",
                        getSkillColor((slot.users as { skill_level: number } | null)?.skill_level ?? 5)
                      )}
                    >
                      {(slot.users as { display_name: string } | null)?.display_name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{(slot.users as { display_name: string } | null)?.display_name}</p>
                      <p className="text-xs text-gray-400">
                        Skill {(slot.users as { skill_level: number } | null)?.skill_level}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              No unclaimed slots available. Ask the moderator to add you.
            </p>
          )}
        </div>
      )}

      {/* My status card */}
      {mySlot && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">My Status</h2>
              <p className="text-sm text-gray-500">
                {myStats?.matchesPlayed ?? 0} games played
                {(myStats?.gamesSinceLastPlayed ?? 0) > 0 && (
                  <> · Sat {myStats?.gamesSinceLastPlayed} games</>
                )}
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                mySlot.is_active
                  ? "bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600"
                  : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700"
              )}
            >
              {mySlot.is_active ? "Active ✓" : "Inactive – Tap to join"}
            </button>
          </div>

          {myCurrentGame && (
            <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="mb-1 text-xs font-semibold text-green-700">
                🏸 Now playing on Court {myCurrentGame.court_number}! (Team {myTeam})
              </p>
              <div className="text-sm text-gray-700">
                <span className="font-medium">
                  {getPlayer(myCurrentGame.team_a_player_1)?.display_name} &{" "}
                  {getPlayer(myCurrentGame.team_a_player_2)?.display_name}
                </span>
                <span className="mx-2 text-gray-400">vs</span>
                <span className="font-medium">
                  {getPlayer(myCurrentGame.team_b_player_1)?.display_name} &{" "}
                  {getPlayer(myCurrentGame.team_b_player_2)?.display_name}
                </span>
              </div>
              <button
                onClick={() => setResultModal({ pairingId: myCurrentGame.id })}
                className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
              >
                Record Result
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current courts */}
      {inProgressPairings.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-800">Courts in Play</h2>
          <div className="space-y-3">
            {inProgressPairings.map((p) => {
              const isMyGame = [
                p.team_a_player_1, p.team_a_player_2,
                p.team_b_player_1, p.team_b_player_2,
              ].includes(currentUserId);

              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-lg border p-3",
                    isMyGame && "border-green-400 bg-green-50"
                  )}
                >
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">
                    Court {p.court_number} {isMyGame && "← You're here!"}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span>
                      {getPlayer(p.team_a_player_1)?.display_name} &{" "}
                      {getPlayer(p.team_a_player_2)?.display_name}
                    </span>
                    <span className="text-gray-400">vs</span>
                    <span>
                      {getPlayer(p.team_b_player_1)?.display_name} &{" "}
                      {getPlayer(p.team_b_player_2)?.display_name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent results */}
      {completedPairings.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-800">
            Recent Results ({completedPairings.length})
          </h2>
          <div className="space-y-2">
            {completedPairings
              .slice(-5)
              .reverse()
              .map((p) => {
                const result = p.game_results ?? null;
                const isMyGame = [
                  p.team_a_player_1, p.team_a_player_2,
                  p.team_b_player_1, p.team_b_player_2,
                ].includes(currentUserId);
                const iWon =
                  isMyGame &&
                  result &&
                  ((result.winner_team === "team_a" &&
                    [p.team_a_player_1, p.team_a_player_2].includes(currentUserId)) ||
                    (result.winner_team === "team_b" &&
                      [p.team_b_player_1, p.team_b_player_2].includes(currentUserId)));

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                      isMyGame
                        ? iWon
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-100"
                        : "bg-gray-50"
                    )}
                  >
                    <span className="text-gray-600">
                      Court {p.court_number}: {getPlayer(p.team_a_player_1)?.display_name} &amp;{" "}
                      {getPlayer(p.team_a_player_2)?.display_name}{" "}
                      vs {getPlayer(p.team_b_player_1)?.display_name} &amp;{" "}
                      {getPlayer(p.team_b_player_2)?.display_name}
                    </span>
                    {result && (
                      <span className="font-bold text-gray-800">
                        {result.team_a_score}–{result.team_b_score}
                        {isMyGame && (iWon ? " 🏆" : " ✗")}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Result modal */}
      {resultModal && myCurrentGame && (
        <ResultModal
          open={!!resultModal}
          pairingId={resultModal.pairingId}
          sessionId={session.id}
          teamA={[getPlayer(myCurrentGame.team_a_player_1)!, getPlayer(myCurrentGame.team_a_player_2)!]}
          teamB={[getPlayer(myCurrentGame.team_b_player_1)!, getPlayer(myCurrentGame.team_b_player_2)!]}
          onClose={() => setResultModal(null)}
          onConfirm={handleRecordResult}
        />
      )}
    </div>
  );
}

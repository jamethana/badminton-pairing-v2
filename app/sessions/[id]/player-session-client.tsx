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
  // react-3: unclaimedSlots is no longer passed from the server — derived client-side
}

export default function PlayerSessionClient({
  session,
  sessionPlayers,
  pairings: initialPairings,
  currentUserId,
  mySlot: initialMySlot,
}: Props) {
  const [pairings, setPairings] = useState(initialPairings);
  const [mySlot, setMySlot] = useState(initialMySlot);
  const [allPlayers, setAllPlayers] = useState(sessionPlayers);
  const [claiming, setClaiming] = useState(false);
  const [addingSelf, setAddingSelf] = useState(false);
  const [resultModal, setResultModal] = useState<{ pairingId: string } | null>(null);

  // react-3: Derive unclaimedSlots from allPlayers during render instead of
  // maintaining it as independent state that can drift.
  const unclaimedSlots = allPlayers.filter(
    (sp) => sp.user_id !== currentUserId && !(sp.users as Tables<"users"> | null)?.line_user_id
  );

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
        // react-3: Updating allPlayers automatically updates the derived unclaimedSlots
        setAllPlayers((prev) =>
          prev.map((sp) => (sp.id === slotId ? updated : sp))
        );
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleAddSelf = async () => {
    if (mySlot || addingSelf) return;
    setAddingSelf(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/self-join`, {
        method: "POST",
      });
      if (res.ok) {
        const newSlot: SessionPlayer = await res.json();
        setMySlot(newSlot);
        setAllPlayers((prev) => [...prev, newSlot]);
      }
    } finally {
      setAddingSelf(false);
    }
  };

  const handleToggleActive = async () => {
    if (!mySlot) return;
    const newActive = !mySlot.is_active;
    const optimisticSlot = { ...mySlot, is_active: newActive };

    // Optimistic: flip immediately
    setMySlot(optimisticSlot);
    setAllPlayers((prev) => prev.map((sp) => (sp.id === mySlot.id ? optimisticSlot : sp)));

    const res = await fetch(`/api/sessions/${session.id}/players/${mySlot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newActive }),
    });

    if (!res.ok) {
      // Rollback
      setMySlot(mySlot);
      setAllPlayers((prev) => prev.map((sp) => (sp.id === mySlot.id ? mySlot : sp)));
    }
  };

  const handleRecordResult = async (result: {
    team_a_score: number;
    team_b_score: number;
    winner_team: "team_a" | "team_b";
  }) => {
    if (!resultModal) return;
    const { pairingId } = resultModal;
    const now = new Date().toISOString();

    // Optimistic: mark completed and close modal immediately
    setPairings((prev) =>
      prev.map((p) =>
        p.id === pairingId ? { ...p, status: "completed", completed_at: now } : p
      )
    );
    setResultModal(null);

    const res = await fetch(`/api/sessions/${session.id}/pairings/${pairingId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    if (!res.ok) {
      // Rollback
      setPairings((prev) =>
        prev.map((p) =>
          p.id === pairingId ? { ...p, status: "in_progress", completed_at: null } : p
        )
      );
    }
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
                        getSkillColor(slot.users?.skill_level ?? 5)
                      )}
                    >
                      {slot.users?.display_name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{slot.users?.display_name}</p>
                      <p className="text-xs text-gray-400">
                        Skill {slot.users?.skill_level}
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

          {/* Self-join fallback when name isn't in the list */}
          <div className="mt-4 border-t pt-3">
            <p className="mb-1 text-xs font-medium text-gray-500">
              Can&apos;t find your name?
            </p>
            <p className="mb-2 text-xs text-gray-400">
              You can add yourself to this session using your LINE account.
            </p>
            <button
              type="button"
              onClick={handleAddSelf}
              disabled={claiming || addingSelf}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm font-semibold",
                "border border-dashed",
                addingSelf
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50"
              )}
            >
              {addingSelf ? "Adding you to this session…" : "Add myself to this session"}
            </button>
          </div>
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
                "rounded-full px-5 py-2.5 text-sm font-semibold",
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
              <p className="mb-1.5 text-xs font-semibold text-green-700">
                🏸 Now playing on Court {myCurrentGame.court_number}! (Team {myTeam})
              </p>
              <div className="text-sm text-gray-700">
                <span className="font-medium">
                  {getPlayer(myCurrentGame.team_a_player_1)?.display_name} &amp;{" "}
                  {getPlayer(myCurrentGame.team_a_player_2)?.display_name}
                </span>
                <span className="mx-2 text-gray-400">vs</span>
                <span className="font-medium">
                  {getPlayer(myCurrentGame.team_b_player_1)?.display_name} &amp;{" "}
                  {getPlayer(myCurrentGame.team_b_player_2)?.display_name}
                </span>
              </div>
              <button
                onClick={() => setResultModal({ pairingId: myCurrentGame.id })}
                className="mt-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
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
                  <div className="text-sm">
                    <span className="font-medium">
                      {getPlayer(p.team_a_player_1)?.display_name} &amp;{" "}
                      {getPlayer(p.team_a_player_2)?.display_name}
                    </span>
                    <span className="mx-2 text-gray-400">vs</span>
                    <span className="font-medium">
                      {getPlayer(p.team_b_player_1)?.display_name} &amp;{" "}
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
              // quality-4: .toReversed() is non-mutating
              .toReversed()
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
                      "rounded-lg px-3 py-2 text-sm",
                      isMyGame
                        ? iWon
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-100"
                        : "bg-gray-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-xs text-gray-500">Court {p.court_number}</p>
                      {result && (
                        <span className="flex-shrink-0 font-bold text-gray-800">
                          {(result.team_a_score > 0 || result.team_b_score > 0)
                            ? `${result.team_a_score}–${result.team_b_score} `
                            : ""}
                          {isMyGame && (iWon ? "🏆" : "✗")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-gray-600">
                      <span className="font-medium">{getPlayer(p.team_a_player_1)?.display_name}</span>
                      {" & "}
                      <span className="font-medium">{getPlayer(p.team_a_player_2)?.display_name}</span>
                      <span className="mx-1.5 text-gray-400">vs</span>
                      <span className="font-medium">{getPlayer(p.team_b_player_1)?.display_name}</span>
                      {" & "}
                      <span className="font-medium">{getPlayer(p.team_b_player_2)?.display_name}</span>
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Result modal */}
      {resultModal && myCurrentGame && (
        <ResultModal
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

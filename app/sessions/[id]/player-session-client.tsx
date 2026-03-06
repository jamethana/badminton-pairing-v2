"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";
import ResultModal from "@/components/result-modal";
import AssignmentModal from "@/components/assignment-modal";
import SessionCourtsView from "@/components/session-courts-view";
import PlayerBadge from "@/components/player-badge";
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
}

type ActiveTab = "game" | "players";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("game");
  const [uiError, setUiError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const isCompleted = session.status === "completed";
  const [numCourts, setNumCourts] = useState(session.num_courts);

  // Modal states
  const [resultModal, setResultModal] = useState<{
    pairingId: string;
    courtNumber: number;
  } | null>(null);
  const [assignModal, setAssignModal] = useState<{
    courtNumber: number;
    suggestion?: { teamA: [string, string]; teamB: [string, string] };
    suggestionLoading?: boolean;
  } | null>(null);

  // Derive unclaimed slots for the claim block
  const unclaimedSlots = useMemo(
    () =>
      allPlayers.filter(
        (sp) => sp.user_id !== currentUserId && !(sp.users as Tables<"users"> | null)?.line_user_id
      ),
    [allPlayers, currentUserId]
  );

  const statsMap = useMemo(
    () =>
      computePlayerStats(
        pairings,
        allPlayers.map((sp) => sp.users?.id).filter((id): id is string => id !== null)
      ),
    [pairings, allPlayers]
  );

  // Permission flags from the session
  const canAssignEmptyCourt = session.allow_player_assign_empty_court;
  const canRecordAnyResult = session.allow_player_record_any_result;
  const canRecordOwnResult = session.allow_player_record_own_result;
  const canRecordResult = canRecordAnyResult || canRecordOwnResult;

  const getPlayer = (id: string) =>
    allPlayers.find((sp) => sp.users?.id === id)?.users ?? null;

  const showError = (message: string) => {
    setUiError(message);
    if (errorTimeoutRef.current !== null) window.clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = window.setTimeout(() => setUiError(null), 3500);
  };

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current !== null) window.clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const busyPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    pairings
      .filter((p) => p.status === "in_progress")
      .forEach((p) => {
        ids.add(p.team_a_player_1);
        ids.add(p.team_a_player_2);
        ids.add(p.team_b_player_1);
        ids.add(p.team_b_player_2);
      });
    return ids;
  }, [pairings]);

  const availablePlayers = useMemo(
    () =>
      allPlayers
        .filter((sp) => sp.is_active && sp.users && !busyPlayerIds.has(sp.users.id))
        .map((sp) => ({
          ...sp.users!,
          matchesPlayed: statsMap.get(sp.users!.id)?.matchesPlayed ?? 0,
          gamesSinceLastPlayed: statsMap.get(sp.users!.id)?.gamesSinceLastPlayed ?? 0,
        })),
    [allPlayers, busyPlayerIds, statsMap]
  );

  // ── Claim / self-join handlers ───────────────────────────────────────────
  const handleClaim = async (slotId: string) => {
    if (isCompleted) return;
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
        setAllPlayers((prev) => prev.map((sp) => (sp.id === slotId ? updated : sp)));
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleAddSelf = async () => {
    if (isCompleted) return;
    if (mySlot || addingSelf) return;
    setAddingSelf(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/self-join`, { method: "POST" });
      if (res.ok) {
        const newSlot: SessionPlayer = await res.json();
        setMySlot(newSlot);
        setAllPlayers((prev) => [...prev, newSlot]);
      }
    } finally {
      setAddingSelf(false);
    }
  };

  // ── Active toggle ────────────────────────────────────────────────────────
  const handleToggleActive = async () => {
    if (isCompleted) return;
    if (!mySlot) return;
    const newActive = !mySlot.is_active;
    const optimistic = { ...mySlot, is_active: newActive };
    setMySlot(optimistic);
    setAllPlayers((prev) => prev.map((sp) => (sp.id === mySlot.id ? optimistic : sp)));
    const res = await fetch(`/api/sessions/${session.id}/players/${mySlot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newActive }),
    });
    if (!res.ok) {
      setMySlot(mySlot);
      setAllPlayers((prev) => prev.map((sp) => (sp.id === mySlot.id ? mySlot : sp)));
    }
  };

  // ── Record result ────────────────────────────────────────────────────────
  const handleRecordResult = async (result: {
    team_a_score: number;
    team_b_score: number;
    winner_team: "team_a" | "team_b";
  }) => {
    if (isCompleted) return;
    if (!resultModal) return;
    const { pairingId } = resultModal;
    const now = new Date().toISOString();
    setPairings((prev) =>
      prev.map((p) => (p.id === pairingId ? { ...p, status: "completed", completed_at: now } : p))
    );
    setResultModal(null);
    const res = await fetch(`/api/sessions/${session.id}/pairings/${pairingId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (!res.ok) {
      setPairings((prev) =>
        prev.map((p) =>
          p.id === pairingId ? { ...p, status: "in_progress", completed_at: null } : p
        )
      );
    }
  };

  // ── Assign court ─────────────────────────────────────────────────────────
  const handleEmptyCourtClick = (courtNumber: number) => {
    setAssignModal({ courtNumber, suggestionLoading: true });
    fetch(`/api/sessions/${session.id}/pairings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generate: true, court_number: courtNumber }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAssignModal((prev) =>
          prev?.courtNumber === courtNumber
            ? { ...prev, suggestion: data?.suggestion, suggestionLoading: false }
            : prev
        );
      })
      .catch(() => {
        setAssignModal((prev) =>
          prev?.courtNumber === courtNumber ? { ...prev, suggestionLoading: false } : prev
        );
      });
  };

  const handleEmptyCourtClickWithPermission = (courtNumber: number) => {
    if (isCompleted) return;
    if (!canAssignEmptyCourt) {
      showError("You don’t have permission to assign players to a court. Ask a moderator.");
      return;
    }
    handleEmptyCourtClick(courtNumber);
  };

  const handleInProgressCourtClickWithPermission = (courtNumber: number, pairingId: string) => {
    if (isCompleted) return;
    const p = pairings.find((x) => x.id === pairingId);
    if (!p) return;

    if (canRecordAnyResult) {
      setResultModal({ pairingId, courtNumber });
      return;
    }

    if (canRecordOwnResult) {
      const isParticipant = [
        p.team_a_player_1,
        p.team_a_player_2,
        p.team_b_player_1,
        p.team_b_player_2,
      ].includes(currentUserId);
      if (!isParticipant) {
        showError("You can only record results for games you’re playing in.");
        return;
      }
      setResultModal({ pairingId, courtNumber });
      return;
    }

    showError("You don’t have permission to record results. Ask a moderator.");
  };

  const handleConfirmAssignment = async (assignment: {
    teamA: [string, string];
    teamB: [string, string];
  }) => {
    if (isCompleted) return;
    if (!assignModal) return;
    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const tempPairing: Pairing = {
      id: tempId,
      session_id: session.id,
      court_number: assignModal.courtNumber,
      team_a_player_1: assignment.teamA[0],
      team_a_player_2: assignment.teamA[1],
      team_b_player_1: assignment.teamB[0],
      team_b_player_2: assignment.teamB[1],
      status: "in_progress",
      sequence_number: Math.max(0, ...pairings.map((p) => p.sequence_number)) + 1,
      created_at: now,
      completed_at: null,
      game_results: null,
    };
    setPairings((prev) => [...prev, tempPairing]);
    setAssignModal(null);

    const res = await fetch(`/api/sessions/${session.id}/pairings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        court_number: assignModal.courtNumber,
        team_a_player_1: assignment.teamA[0],
        team_a_player_2: assignment.teamA[1],
        team_b_player_1: assignment.teamB[0],
        team_b_player_2: assignment.teamB[1],
      }),
    });
    if (res.ok) {
      const newPairing = await res.json();
      setPairings((prev) =>
        prev.map((p) => (p.id === tempId ? { ...newPairing, game_results: null } : p))
      );
    } else {
      setPairings((prev) => prev.filter((p) => p.id !== tempId));
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────
  const myStats = mySlot ? statsMap.get(currentUserId) : null;
  const inProgressPairings = useMemo(() => pairings.filter((p) => p.status === "in_progress"), [pairings]);
  const completedPairings = useMemo(() => pairings.filter((p) => p.status === "completed"), [pairings]);

  const myCurrentGame = useMemo(
    () =>
      mySlot
        ? inProgressPairings.find((p) =>
            [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2].includes(
              currentUserId
            )
          ) ?? null
        : null,
    [mySlot, inProgressPairings, currentUserId]
  );

  const myTeam = myCurrentGame
    ? [myCurrentGame.team_a_player_1, myCurrentGame.team_a_player_2].includes(currentUserId)
      ? "A"
      : "B"
    : null;

  const resultPairing = resultModal
    ? pairings.find((p) => p.id === resultModal.pairingId) ?? null
    : null;

  // Active permission indicators for player info banner
  const permLabels: string[] = [];
  if (canAssignEmptyCourt) permLabels.push("assign empty courts");
  if (canRecordAnyResult) permLabels.push("record any result");
  else if (canRecordOwnResult) permLabels.push("record own result");

  const lastCourtHasGame = useMemo(
    () =>
      pairings.some(
        (p) => p.court_number === numCourts && p.status === "in_progress",
      ),
    [pairings, numCourts]
  );

  const handleAddCourt = async () => {
    if (isCompleted || !session.allow_player_add_remove_courts) return;
    setNumCourts((n) => n + 1);
    const res = await fetch(`/api/sessions/${session.id}/courts`, { method: "POST" });
    if (!res.ok) {
      setNumCourts((n) => n - 1);
      showError("Could not add a new court. Please try again.");
    }
  };

  const handleRemoveLastCourt = async () => {
    if (isCompleted || !session.allow_player_add_remove_courts) return;
    if (numCourts <= 1) {
      showError("You cannot remove the last court.");
      return;
    }
    if (lastCourtHasGame) {
      showError("There is an active game on the last court.");
      return;
    }
    setNumCourts((n) => n - 1);
    const res = await fetch(`/api/sessions/${session.id}/courts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_number: numCourts }),
    });
    if (!res.ok) {
      setNumCourts((n) => n + 1);
      showError("Could not remove that court. Please try again.");
    }
  };

  // ── Pre-join view ────────────────────────────────────────────────────────
  if (!mySlot) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-800">Claim Your Slot</h2>
          {unclaimedSlots.length > 0 ? (
            <>
              <p className="mb-3 text-sm text-gray-500">Tap your name to link your LINE account:</p>
              <div className="space-y-2">
                {unclaimedSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={isCompleted ? undefined : () => handleClaim(slot.id)}
                    disabled={claiming || isCompleted}
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
                      <p className="text-xs text-gray-400">Skill {slot.users?.skill_level}</p>
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

          <div className="mt-4 border-t pt-3">
            <p className="mb-1 text-xs font-medium text-gray-500">Can&apos;t find your name?</p>
            <p className="mb-2 text-xs text-gray-400">
              You can add yourself to this session using your LINE account.
            </p>
            <button
              type="button"
              onClick={isCompleted ? undefined : handleAddSelf}
              disabled={claiming || addingSelf || isCompleted}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm font-semibold border border-dashed",
                addingSelf
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50"
              )}
            >
              {addingSelf ? "Adding you to this session…" : "Add myself to this session"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Post-join view ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b bg-white rounded-t-xl overflow-hidden">
        {(["game", "players"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-green-600 text-green-700"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === "game" ? "Game" : `Players (${allPlayers.length})`}
          </button>
        ))}
      </div>

      {activeTab === "game" && (
        <>
          {/* My status */}
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
                onClick={isCompleted ? undefined : handleToggleActive}
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
                {canRecordResult && (
                  <button
                    onClick={() =>
                      setResultModal({ pairingId: myCurrentGame.id, courtNumber: myCurrentGame.court_number })
                    }
                    className="mt-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Record Result
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Permission banner */}
          {permLabels.length > 0 && (
            <p className="px-1 text-xs text-gray-400">
              You can: {permLabels.join(" · ")}
            </p>
          )}
          {uiError && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {uiError}
            </div>
          )}

          {/* Full courts view */}
          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold text-gray-800">
              Courts ({numCourts})
            </h2>
            {session.allow_player_add_remove_courts && !isCompleted && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">Players can manage courts.</span>
                <button
                  type="button"
                  onClick={handleAddCourt}
                  className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700 hover:bg-green-100"
                >
                  + Add court
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLastCourt}
                  disabled={numCourts <= 1 || lastCourtHasGame}
                  className={cn(
                    "rounded-full px-3 py-1 font-semibold",
                    numCourts <= 1 || lastCourtHasGame
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  )}
                >
                  Remove last court
                </button>
              </div>
            )}
            <SessionCourtsView
              numCourts={numCourts}
              courtNames={session.court_names}
              pairings={pairings}
              sessionPlayers={allPlayers}
              currentUserId={currentUserId}
              emptyCourtText={
                canAssignEmptyCourt
                  ? "Tap to assign players"
                  : "No permission to assign players"
              }
              onEmptyCourtClick={isCompleted ? undefined : handleEmptyCourtClickWithPermission}
              onInProgressCourtClick={isCompleted ? undefined : handleInProgressCourtClickWithPermission}
            />
          </div>

          {/* Recent results */}
          {completedPairings.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 font-semibold text-gray-800">
                Recent Results ({completedPairings.length})
              </h2>
              <div className="space-y-2">
                {completedPairings
                  .slice(-5)
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
                              {result.team_a_score > 0 || result.team_b_score > 0
                                ? `${result.team_a_score}–${result.team_b_score} `
                                : ""}
                              {isMyGame && (iWon ? "🏆" : "✗")}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-gray-600">
                          <span className="font-medium">
                            {getPlayer(p.team_a_player_1)?.display_name}
                          </span>
                          {" & "}
                          <span className="font-medium">
                            {getPlayer(p.team_a_player_2)?.display_name}
                          </span>
                          <span className="mx-1.5 text-gray-400">vs</span>
                          <span className="font-medium">
                            {getPlayer(p.team_b_player_1)?.display_name}
                          </span>
                          {" & "}
                          <span className="font-medium">
                            {getPlayer(p.team_b_player_2)?.display_name}
                          </span>
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "players" && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-gray-700">
              {allPlayers.length} player{allPlayers.length !== 1 ? "s" : ""} in this session
            </p>
          </div>
          <div className="divide-y">
            {allPlayers
              .filter((sp) => sp.users)
              .toSorted((a, b) => {
                // Sort: playing first, then active, then inactive
                const busyA = busyPlayerIds.has(a.users!.id);
                const busyB = busyPlayerIds.has(b.users!.id);
                if (busyA !== busyB) return busyA ? -1 : 1;
                if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
                return a.users!.display_name.localeCompare(b.users!.display_name);
              })
              .map((sp) => {
                const stats = statsMap.get(sp.users!.id);
                const isBusy = busyPlayerIds.has(sp.users!.id);
                const isMe = sp.users!.id === currentUserId;

                return (
                  <div
                    key={sp.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      !sp.is_active && "opacity-50"
                    )}
                  >
                    <PlayerBadge
                      name={sp.users!.display_name + (isMe ? " (You)" : "")}
                      skillLevel={sp.users!.skill_level}
                      pictureUrl={sp.users!.picture_url}
                      matchesPlayed={stats?.matchesPlayed}
                      gamesSinceLastPlayed={stats?.gamesSinceLastPlayed}
                      isActive={sp.is_active}
                      isLinked={!!sp.users!.line_user_id}
                      className="flex-1"
                    />
                    {isBusy && (
                      <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Playing
                      </span>
                    )}
                    {!isBusy && sp.is_active && (
                      <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Ready
                      </span>
                    )}
                    {!isBusy && !sp.is_active && (
                      <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        zzz
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Assignment modal */}
      {assignModal && (
        <AssignmentModal
          courtNumber={assignModal.courtNumber}
          sessionId={session.id}
          availablePlayers={availablePlayers}
          suggestion={assignModal.suggestion}
          suggestionLoading={assignModal.suggestionLoading}
          onClose={() => setAssignModal(null)}
          onConfirm={handleConfirmAssignment}
        />
      )}

      {/* Result modal */}
      {resultModal && resultPairing && (
        <ResultModal
          pairingId={resultModal.pairingId}
          sessionId={session.id}
          teamA={[
            getPlayer(resultPairing.team_a_player_1)!,
            getPlayer(resultPairing.team_a_player_2)!,
          ]}
          teamB={[
            getPlayer(resultPairing.team_b_player_1)!,
            getPlayer(resultPairing.team_b_player_2)!,
          ]}
          onClose={() => setResultModal(null)}
          onConfirm={handleRecordResult}
        />
      )}
    </div>
  );
}

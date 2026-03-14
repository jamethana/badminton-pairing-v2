"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSkillColor } from "@/components/skill-bar";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import { createClient } from "@/lib/supabase/client";
import ResultModal from "@/components/result-modal";
import AssignmentModal from "@/components/assignment-modal";
import SessionCourtsView from "@/components/session-courts-view";
import SessionResultsList from "@/components/session-results-list";
import PlayerBadge from "@/components/player-badge";
import { computePlayerStats } from "@/lib/utils/session-stats";
import { getDeletedUserPlaceholder } from "@/lib/utils/deleted-user";
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

type ActiveTab = "game" | "players" | "history";

function SmallAvatar({
  pictureUrl,
  displayName,
  size = 24,
}: {
  pictureUrl: string | null | undefined;
  displayName: string;
  size?: number;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200"
    >
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-[10px] font-semibold text-gray-500">{initial}</span>
      )}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("game");
  const [uiError, setUiError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  const hasAutoJoinAttemptedRef = useRef(false);
  const [sessionFullFromApi, setSessionFullFromApi] = useState(false);
  const [autoJoinFailed, setAutoJoinFailed] = useState(false);

  const isCompleted = session.status === "completed";
  const [numCourts, setNumCourts] = useState(session.num_courts);
  const [sessionUpdatedToast, setSessionUpdatedToast] = useState(false);
  const [isReconnectingFromVisibility, setIsReconnectingFromVisibility] = useState(false);
  const [addCourtLoading, setAddCourtLoading] = useState(false);
  const [removeCourtLoading, setRemoveCourtLoading] = useState(false);

  const router = useRouter();

  const refetchSessionPlayers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("session_players")
      .select("*, users(*)")
      .eq("session_id", session.id);
    if (data) {
      setAllPlayers(data as SessionPlayer[]);
      setMySlot((prev) => {
        if (!prev) return null;
        const updated = data.find((sp) => sp.id === prev!.id);
        return updated ? (updated as SessionPlayer) : prev;
      });
    }
  }, [session.id]);

  const refetchPairings = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("pairings")
      .select("*, game_results(*)")
      .eq("session_id", session.id)
      .order("sequence_number", { ascending: true });
    if (data) setPairings(data as Pairing[]);
  }, [session.id]);

  useSessionRealtime(session.id, {
    onSession: (row) => {
      setNumCourts(row.num_courts);
      if (row.status === "completed") router.refresh();
    },
    onSessionPlayers: () => {
      void refetchSessionPlayers();
    },
    onPairings: (op, row) => {
      if (op === "DELETE") {
        setPairings((prev) => prev.filter((p) => p.id !== row.id));
        return;
      }
      if (row.id.startsWith("temp-")) return;
      const pairing: Pairing = {
        ...row,
        status: row.status as "in_progress" | "completed" | "voided",
        game_results: null,
      };
      setPairings((prev) => {
        const idx = prev.findIndex((p) => p.id === row.id);
        if (idx >= 0) return prev.map((p) => (p.id === row.id ? pairing : p));
        return [...prev, pairing];
      });
    },
    onGameResults: (_, row) => {
      setPairings((prev) => {
        if (!prev.some((p) => p.id === row.pairing_id)) return prev;
        void refetchPairings();
        return prev;
      });
    },
    onRemoteUpdate: () => {
      setSessionUpdatedToast(true);
      setTimeout(() => setSessionUpdatedToast(false), 3000);
    },
    onReconnectingStart: () => {
      setIsReconnectingFromVisibility(true);
    },
    onSubscribed: async (isResubscribe) => {
      if (!isResubscribe) return;
      await Promise.all([refetchSessionPlayers(), refetchPairings()]);
      setIsReconnectingFromVisibility(false);
    },
  });

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

  const getPlayer = (id: string | null) => {
    if (id == null) return getDeletedUserPlaceholder();
    const user = allPlayers.find((sp) => sp.users?.id === id)?.users ?? null;
    return user ?? getDeletedUserPlaceholder();
  };

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
        [p.team_a_player_1, p.team_a_player_2, p.team_b_player_1, p.team_b_player_2]
          .filter((id): id is string => id != null)
          .forEach((id) => ids.add(id));
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
    setAutoJoinFailed(false);
    setAddingSelf(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/self-join`, { method: "POST" });
      if (res.ok) {
        const newSlot: SessionPlayer = await res.json();
        setMySlot(newSlot);
        setAllPlayers((prev) => [...prev, newSlot]);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        const message = typeof body?.error === "string" ? body.error : "Could not join session.";
        if (res.status === 409 && typeof body?.error === "string" && body.error.toLowerCase().includes("full")) {
          setSessionFullFromApi(true);
        } else {
          setAutoJoinFailed(true);
        }
        showError(message);
      }
    } finally {
      setAddingSelf(false);
    }
  };

  // Auto-join once on mount when user has no slot and session is not full
  useEffect(() => {
    if (
      mySlot ||
      isCompleted ||
      hasAutoJoinAttemptedRef.current ||
      sessionFullFromApi ||
      allPlayers.length >= session.max_players
    ) {
      return;
    }
    hasAutoJoinAttemptedRef.current = true;
    setAddingSelf(true);
    fetch(`/api/sessions/${session.id}/self-join`, { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          const newSlot: SessionPlayer = await res.json();
          setMySlot(newSlot);
          setAllPlayers((prev) => [...prev, newSlot]);
          router.refresh();
        } else {
          const body = await res.json().catch(() => ({}));
          if (res.status === 409 && typeof body?.error === "string" && body.error.toLowerCase().includes("full")) {
            setSessionFullFromApi(true);
          } else {
            setAutoJoinFailed(true);
          }
        }
      })
      .finally(() => {
        setAddingSelf(false);
      });
  }, [mySlot, isCompleted, sessionFullFromApi, allPlayers.length, session.id, session.max_players, router]);

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
    const optimisticResult: Tables<"game_results"> = {
      id: `temp-result-${pairingId}`,
      pairing_id: pairingId,
      team_a_score: result.team_a_score,
      team_b_score: result.team_b_score,
      winner_team: result.winner_team,
      recorded_by: null,
      recorded_at: now,
    };
    setPairings((prev) =>
      prev.map((p) =>
        p.id === pairingId
          ? { ...p, status: "completed", completed_at: now, game_results: optimisticResult }
          : p
      )
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
          p.id === pairingId
            ? { ...p, status: "in_progress", completed_at: null, game_results: null }
            : p
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
  const completedPairingsNewestFirst = useMemo(
    () => [...completedPairings].sort((a, b) => b.sequence_number - a.sequence_number),
    [completedPairings]
  );

  const myCurrentGame = useMemo(
    () =>
      mySlot
        ? inProgressPairings.find((p) => {
            const ids = [
              p.team_a_player_1,
              p.team_a_player_2,
              p.team_b_player_1,
              p.team_b_player_2,
            ].filter((id): id is string => id != null);
            return ids.includes(currentUserId);
          }) ?? null
        : null,
    [mySlot, inProgressPairings, currentUserId]
  );

  const myTeam = myCurrentGame
    ? [
        myCurrentGame.team_a_player_1,
        myCurrentGame.team_a_player_2,
      ].filter((id): id is string => id != null).includes(currentUserId)
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
    if (isCompleted || !session.allow_player_add_remove_courts || addCourtLoading) return;
    setAddCourtLoading(true);
    setNumCourts((n) => n + 1);
    const res = await fetch(`/api/sessions/${session.id}/courts`, { method: "POST" });
    if (!res.ok) {
      setNumCourts((n) => n - 1);
      showError("Could not add a new court. Please try again.");
    }
    setAddCourtLoading(false);
  };

  const handleRemoveLastCourt = async () => {
    if (isCompleted || !session.allow_player_add_remove_courts || removeCourtLoading) return;
    if (numCourts <= 1) {
      showError("You cannot remove the last court.");
      return;
    }
    if (lastCourtHasGame) {
      showError("There is an active game on the last court.");
      return;
    }
    setRemoveCourtLoading(true);
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
    setRemoveCourtLoading(false);
  };

  // ── Pre-join view ────────────────────────────────────────────────────────
  const isSessionFull = sessionFullFromApi || allPlayers.length >= session.max_players;

  if (!mySlot) {
    // Session full — viewer-only message
    if (isSessionFull) {
      return (
        <div className="space-y-4">
          {isReconnectingFromVisibility && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700"
            >
              <span className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
              Syncing…
            </div>
          )}
          {sessionUpdatedToast && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800"
            >
              Session updated by another user
            </div>
          )}
          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-2 font-semibold text-gray-800">Session full</h2>
            <p className="text-sm text-gray-500">
              This session is full. You can still view the session.
            </p>
          </div>
        </div>
      );
    }

    // Auto-join failed — minimal retry fallback
    if (autoJoinFailed) {
      return (
        <div className="space-y-4">
          {isReconnectingFromVisibility && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700"
            >
              <span className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
              Syncing…
            </div>
          )}
          {sessionUpdatedToast && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800"
            >
              Session updated by another user
            </div>
          )}
          <div className="rounded-xl border bg-white p-4">
            <p className="mb-3 text-sm text-gray-500">
              {uiError ?? "Couldn't join automatically. Try again below."}
            </p>
            <button
              type="button"
              onClick={handleAddSelf}
              disabled={addingSelf}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold border border-dashed border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50 disabled:opacity-60"
            >
              {addingSelf ? "Adding you to this session…" : "Add myself to this session"}
            </button>
          </div>
        </div>
      );
    }

    // Joining skeleton — shown on initial load and while auto-join is in progress
    return (
      <div className="space-y-4">
        {/* Tabs skeleton */}
        <div className="flex border-b bg-white rounded-t-xl overflow-hidden">
          <div className="flex-1 py-3 flex items-center justify-center">
            <div className="h-4 w-10 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="flex-1 py-3 flex items-center justify-center">
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>
        </div>

        {/* My Status card skeleton */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-5 w-24 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-32 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
            <div className="h-8 w-20 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
          </div>
        </div>

        {/* Courts skeleton */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="h-5 w-16 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
            >
              <div className="space-y-1">
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
                <div className="h-3 w-28 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-7 w-20 rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Post-join view ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {isReconnectingFromVisibility && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700"
        >
          <span className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
          Syncing…
        </div>
      )}
      {sessionUpdatedToast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800"
        >
          Session updated by another user
        </div>
      )}
      {/* Tabs */}
      <div className="flex border-b bg-white rounded-t-xl overflow-hidden">
        {(["game", "players", "history"] as ActiveTab[]).map((tab) => (
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
            {tab === "game" ? "Game" : tab === "players" ? `Players (${allPlayers.length})` : `History (${completedPairings.length})`}
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

            {!myCurrentGame && !isCompleted && mySlot.is_active && (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3"
              >
                <p className="text-sm font-medium text-gray-700">Waiting to be assigned</p>
                <p className="text-sm text-gray-500">
                  You&apos;re in the queue. The moderator will assign you to a court soon.
                </p>
              </div>
            )}

            {!myCurrentGame && !isCompleted && !mySlot.is_active && (
              <p className="mt-2 text-xs text-gray-400">
                Tap the button when you&apos;re ready to be assigned.
              </p>
            )}

            {myCurrentGame && (() => {
              const pA1 = getPlayer(myCurrentGame.team_a_player_1);
              const pA2 = getPlayer(myCurrentGame.team_a_player_2);
              const pB1 = getPlayer(myCurrentGame.team_b_player_1);
              const pB2 = getPlayer(myCurrentGame.team_b_player_2);
              return (
              <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="mb-1.5 text-xs font-semibold text-green-700">
                  🏸 Now playing on Court {myCurrentGame.court_number}! (Team {myTeam})
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <SmallAvatar pictureUrl={pA1.picture_url} displayName={pA1.display_name} />
                    {pA1.display_name}
                  </span>
                  <span className="text-gray-500">&</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <SmallAvatar pictureUrl={pA2.picture_url} displayName={pA2.display_name} />
                    {pA2.display_name}
                  </span>
                  <span className="mx-2 text-gray-400">vs</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <SmallAvatar pictureUrl={pB1.picture_url} displayName={pB1.display_name} />
                    {pB1.display_name}
                  </span>
                  <span className="text-gray-500">&</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <SmallAvatar pictureUrl={pB2.picture_url} displayName={pB2.display_name} />
                    {pB2.display_name}
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
              );
            })()}
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
                  disabled={addCourtLoading}
                  className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {addCourtLoading ? "Adding…" : "+ Add court"}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLastCourt}
                  disabled={numCourts <= 1 || lastCourtHasGame || removeCourtLoading}
                  className={cn(
                    "rounded-full px-3 py-1 font-semibold",
                    numCourts <= 1 || lastCourtHasGame || removeCourtLoading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  )}
                >
                  {removeCourtLoading ? "Removing…" : "Remove last court"}
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
                    const playerIds = [
                      p.team_a_player_1,
                      p.team_a_player_2,
                      p.team_b_player_1,
                      p.team_b_player_2,
                    ].filter((id): id is string => id != null);
                    const isMyGame = playerIds.includes(currentUserId);
                    const teamAIds = [p.team_a_player_1, p.team_a_player_2].filter(
                      (id): id is string => id != null
                    );
                    const teamBIds = [p.team_b_player_1, p.team_b_player_2].filter(
                      (id): id is string => id != null
                    );
                    const iWon =
                      isMyGame &&
                      result &&
                      ((result.winner_team === "team_a" && teamAIds.includes(currentUserId)) ||
                        (result.winner_team === "team_b" && teamBIds.includes(currentUserId)));

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

      {activeTab === "history" && (
        <SessionResultsList
          pairings={completedPairingsNewestFirst}
          getPlayer={getPlayer}
        />
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
            getPlayer(resultPairing.team_a_player_1),
            getPlayer(resultPairing.team_a_player_2),
          ]}
          teamB={[
            getPlayer(resultPairing.team_b_player_1),
            getPlayer(resultPairing.team_b_player_2),
          ]}
          onClose={() => setResultModal(null)}
          onConfirm={handleRecordResult}
        />
      )}
    </div>
  );
}
